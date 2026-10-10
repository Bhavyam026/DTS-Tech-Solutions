import os
import re
import urllib.parse
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("CRITICAL ERROR: GEMINI_API_KEY environment variable is missing! Please set it before running the app.")

genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """
You are a friendly, fast, natural technical sales assistant for DTS (Dynamic Technology Solutions), Boisar. Help customers with CCTV, NVR/DVR, monitors, biometric systems, networking, electrical work, fire safety, access control, cabling, AMC and related IT products.

RULES:
1. NO PRICING: Never quote or estimate prices. If asked, reply exactly: "Pricing aur exact cost ke liye kripya hamare owner/expert se direct baat karein."
2. NATURAL, NON-REPETITIVE: Answer the customer's latest message directly and briefly. Remember details already shared. Do not restart the conversation, repeat a checklist, or ask again for information already provided. If the customer says hello or asks "ky hua?", respond naturally to that message.
3. SHORT OPENING: If the customer greets you or has not explained their requirement yet, use one short sentence such as "Sure! 😊 Bataiye, aapko kya chahiye?" Do not give examples, long explanations, or multi-line prompts unless asked.
4. TYPO FRIENDLY: Understand normal spelling mistakes and Roman Hindi naturally, including eletrical, camra, dekstop, hdd, chiye and similar typos.
5. HONEST PRODUCT ANSWERS: Do not invent product models, specifications, stock, warranty, prices or completed actions. If unsure, say DTS will confirm.
6. REQUIREMENT GATHERING: Collect only useful missing details. When enough details are available, prepare a concise summary and ask the customer to confirm it.
7. WHATSAPP HANDOFF: Never claim a summary was sent. A WhatsApp handoff link may be prepared only after explicit customer confirmation and the required customer mobile number is provided. A number that passes format validation is not ownership-verified; never claim it is real or active without OTP verification.
8. LANGUAGE: Reply naturally in Hindi/Roman Hindi or English, matching the customer.
"""

generation_config = {
    "temperature": 0.5,
    "top_p": 0.9,
    "max_output_tokens": 250,
}

model = genai.GenerativeModel(
    model_name=os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"),
    generation_config=generation_config,
    system_instruction=SYSTEM_INSTRUCTION
)

chat_sessions = {}
customer_numbers = {}
pending_summaries = {}

DTS_WHATSAPP_NUMBER = re.sub(r"\D", "", os.environ.get("DTS_WHATSAPP_NUMBER", "918390909845"))

def normalize_indian_mobile(value):
    digits = re.sub(r"\D", "", str(value or ""))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10 and digits[0] in "6789":
        return digits
    return None

def extract_mobile(text):
    matches = re.findall(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)", text or "")
    for match in matches:
        number = normalize_indian_mobile(match)
        if number:
            return number
    return None

def is_confirmation(text):
    value = (text or "").lower().strip()
    confirmations = [
        "yes", "yes please", "confirm", "confirmed", "bhej do", "send it",
        "send", "theek hai", "thik hai", "ok", "okay", "haan", "ha",
        "sab barabar hai", "done", "final", "correct", "sahi hai"
    ]
    return any(re.search(r"\b" + re.escape(word) + r"\b", value) for word in confirmations)

def build_clean_summary(chat_session):
    lines = []
    for message in chat_session.history:
        role = "Customer" if message.role == "user" else "DTS AI"
        text = ""
        if getattr(message, "parts", None):
            text = getattr(message.parts[0], "text", "") or ""
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines[-30:])

def create_whatsapp_link(summary, customer_number):
    message = (
        "DTS AI Enquiry\n"
        "--------------------\n"
        f"{summary}\n\n"
        f"Customer mobile: +91 {customer_number}\n"
        "Mobile format: Valid Indian mobile format (ownership not OTP-verified)."
    )
    return f"https://wa.me/{DTS_WHATSAPP_NUMBER}?text={urllib.parse.quote(message)}"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "DTS Gemini AI Backend",
        "ai_configured": bool(GEMINI_API_KEY),
        "whatsapp_configured": bool(DTS_WHATSAPP_NUMBER),
        "mobile_validation": "indian_10_digit_format",
        "mobile_ownership_verification": "not_configured",
        "note": "Format-valid numbers are not treated as ownership verified."
    })

@app.route("/chat", methods=["POST"])
@app.route("/api/chat", methods=["POST"])
def chat():
    session_id = "global_dts_customer_session"
    try:
        data = request.get_json(silent=True) or {}
        user_message = (data.get("message") or "").strip()
        session_id = data.get("session_id") or session_id

        messages = data.get("messages") or []
        if not user_message and messages:
            for item in reversed(messages):
                if item.get("role") == "user":
                    user_message = (item.get("content") or "").strip()
                    break

        if not user_message:
            return jsonify({"status": "error", "reply": "Kripya apna message likhein."}), 400

        if session_id not in chat_sessions:
            chat_sessions[session_id] = model.start_chat(history=[])

        chat_session = chat_sessions[session_id]
        response = chat_session.send_message(user_message)
        bot_reply = (getattr(response, "text", "") or "").strip()

        if not bot_reply:
            bot_reply = "Ji, batayiye. Main aapki requirement note kar raha hoon."

        # Anti-loop guard inspired by the supplied test code. Keep conversation history;
        # never clear the session, because that would lose the customer's requirement.
        loop_phrases = (
            "context mere paas hai",
            "next detail pending hai",
            "camera quantity, indoor/outdoor",
            "please describe your requirement in a little more detail",
        )
        if any(phrase in bot_reply.lower() for phrase in loop_phrases):
            history_text = " ".join(
                (getattr(part, "text", "") or "")
                for item in chat_session.history[-12:]
                for part in (getattr(item, "parts", None) or [])
            ).lower()
            if any(term in history_text for term in ("cctv", "camera", "ip cctv")):
                bot_reply = "Bilkul! 😊 CCTV ke liye kya chahiye?"
            else:
                bot_reply = "Sure! 😊 Bataiye, aapko kya chahiye?"

        mobile = extract_mobile(user_message)
        if mobile:
            customer_numbers[session_id] = mobile

        current_summary = build_clean_summary(chat_session)
        pending_summaries[session_id] = current_summary

        whatsapp_link = None
        handoff_ready = False

        # WhatsApp handoff is generated only after an explicit customer confirmation.
        # Chat length alone can never trigger the handoff.
        if is_confirmation(user_message):
            customer_number = customer_numbers.get(session_id)
            if not customer_number:
                bot_reply += "\n\nWhatsApp par bhejne se pehle apna 10-digit mobile number (6-9 se start) share kijiye."
            else:
                whatsapp_link = create_whatsapp_link(current_summary, customer_number)
                handoff_ready = True
                bot_reply += (
                    "\n\n✅ Requirement summary ready hai. "
                    "Neeche WhatsApp button par click karke DTS ko bhej sakte hain."
                )

        return jsonify({
            "status": "success",
            "reply": bot_reply,
            "whatsapp_link": whatsapp_link,
            "whatsapp_ready": handoff_ready,
            "mobile_provided": bool(customer_numbers.get(session_id)),
            "mobile_verified": False,
            "pending_summary": current_summary
        })

    except Exception as e:
        print(f"Backend Error: {e}")
        return jsonify({
            "status": "error",
            "reply": "Kshama karein, temporary connection issue hua. Aap apna message dobara bhej sakte hain.",
            "whatsapp_link": None,
            "whatsapp_ready": False,
            "mobile_verified": False
        }), 500

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
