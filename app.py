import os
import re
import urllib.parse
from flask import Flask, redirect, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

GEMINI_API_KEY = (os.environ.get("GEMINI_API_KEY") or "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

# Do not crash the whole web service when an optional secret is missing.
# /health remains available and /chat returns a clear configuration error.
model = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    generation_config = {
        "temperature": 0.5,
        "top_p": 0.9,
        "max_output_tokens": 250,
    }

    SYSTEM_INSTRUCTION = """
You are a friendly, fast, natural technical sales assistant for DTS
(Dynamic Technology Solutions), Boisar. Help customers with CCTV, NVR/DVR,
monitors, biometric systems, networking, electrical work, fire safety,
access control, cabling, AMC and related IT products.

RULES:
1. NO PRICING: Never quote or estimate prices. If asked, reply exactly:
   "Pricing aur exact cost ke liye kripya hamare owner/expert se direct baat karein."
2. NATURAL, NON-REPETITIVE: Answer the latest message directly. Remember details
   already shared. Never ask again for a quantity or requirement already given.
3. SHORT OPENING: If the customer greets you or has not explained a requirement,
   use one short sentence such as "Sure! 😊 Bataiye, aapko kya chahiye?"
   Do not give examples or long explanations unless asked.
4. TYPO FRIENDLY: Understand common spelling mistakes and Roman Hindi naturally.
5. HONEST PRODUCT ANSWERS: Do not invent models, specifications, stock, warranty,
   prices or completed actions. If unsure, say DTS will confirm.
6. REQUIREMENT GATHERING: Ask only for useful missing details. When enough details
   are available, summarize the requirement and ask the customer to confirm it.
7. WHATSAPP HANDOFF: Never claim a summary was sent. A WhatsApp link may be
   prepared only after explicit customer confirmation and a mobile number is
   provided. Format validation is not ownership verification.
8. LANGUAGE: Reply naturally in Hindi/Roman Hindi or English, matching the customer.
"""

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=generation_config,
        system_instruction=SYSTEM_INSTRUCTION,
    )

chat_sessions = {}
customer_numbers = {}
pending_summaries = {}

DTS_WHATSAPP_NUMBER = re.sub(
    r"\\D", "", os.environ.get("DTS_WHATSAPP_NUMBER", "918390909845")
)


def normalize_indian_mobile(value):
    digits = re.sub(r"\\D", "", str(value or ""))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10 and digits[0] in "6789":
        return digits
    return None


def extract_mobile(text):
    matches = re.findall(
        r"(?<!\\d)(?:\\+?91[\\s-]?)?[6-9]\\d{9}(?!\\d)",
        text or "",
    )
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
        "sab barabar hai", "done", "final", "correct", "sahi hai",
    ]
    return any(
        re.search(r"\\b" + re.escape(word) + r"\\b", value)
        for word in confirmations
    )


def build_clean_summary(chat_session):
    lines = []
    for message in chat_session.history:
        role = "Customer" if message.role == "user" else "DTS AI"
        text = ""
        if getattr(message, "parts", None):
            text = getattr(message.parts[0], "text", "") or ""
        if text:
            lines.append(f"{role}: {text}")
    return "\\n".join(lines[-30:])


def create_whatsapp_link(summary, customer_number):
    message = (
        "DTS AI Enquiry\\n"
        "--------------------\\n"
        f"{summary}\\n\\n"
        f"Customer mobile: +91 {customer_number}\\n"
        "Mobile format: Valid Indian mobile format (ownership not OTP-verified)."
    )
    return (
        f"https://wa.me/{DTS_WHATSAPP_NUMBER}"
        f"?text={urllib.parse.quote(message)}"
    )


@app.route("/")
def index():
    # The website is hosted on GitHub Pages; there is no Flask templates/index.html.
    return redirect(
        "https://bhavyam026.github.io/DTS-Tech-Solutions/",
        code=302,
    )


@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "DTS Gemini AI Backend",
        "ai_configured": bool(GEMINI_API_KEY and model),
        "whatsapp_configured": bool(DTS_WHATSAPP_NUMBER),
        "mobile_validation": "indian_10_digit_format",
        "mobile_ownership_verification": "not_configured",
        "note": (
            "Health confirms configuration only, not a live Gemini response "
            "or WhatsApp delivery. WhatsApp handoff opens a prefilled link; "
            "it does not send automatically."
        ),
    })


@app.route("/chat", methods=["POST"])
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message") or ""
    user_message = user_message.strip() if isinstance(user_message, str) else ""
    session_id = data.get("session_id") or "global_dts_customer_session"

    messages = data.get("messages") or []
    if not user_message and isinstance(messages, list):
        for item in reversed(messages):
            if isinstance(item, dict) and item.get("role") == "user":
                candidate = item.get("content") or ""
                user_message = candidate.strip() if isinstance(candidate, str) else ""
                break

    if not user_message:
        return jsonify({
            "status": "error",
            "reply": "Kripya apna message likhein.",
        }), 400

    if model is None:
        return jsonify({
            "status": "error",
            "reply": "DTS AI abhi configure nahi hai. Kripya kuch der baad dobara try karein.",
            "whatsapp_link": None,
            "whatsapp_ready": False,
            "mobile_verified": False,
        }), 503

    try:
        if session_id not in chat_sessions:
            chat_sessions[session_id] = model.start_chat(history=[])

        chat_session = chat_sessions[session_id]
        response = chat_session.send_message(user_message)
        bot_reply = (getattr(response, "text", "") or "").strip()

        if not bot_reply:
            bot_reply = "Ji, batayiye. Main aapki requirement note kar raha hoon."

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

        if is_confirmation(user_message):
            customer_number = customer_numbers.get(session_id)
            if not customer_number:
                bot_reply += (
                    "\\n\\nWhatsApp par bhejne se pehle apna 10-digit mobile "
                    "number (6-9 se start) share kijiye."
                )
            else:
                whatsapp_link = create_whatsapp_link(
                    pending_summaries.get(session_id, current_summary),
                    customer_number,
                )
                handoff_ready = True
                bot_reply += (
                    "\\n\\n✅ Requirement summary ready hai. Neeche WhatsApp "
                    "button par click karke DTS ko bhej sakte hain. Message "
                    "automatically send nahi hua hai."
                )

        return jsonify({
            "status": "success",
            "reply": bot_reply,
            "whatsapp_link": whatsapp_link,
            "whatsapp_ready": handoff_ready,
            "mobile_provided": bool(customer_numbers.get(session_id)),
            "mobile_verified": False,
            "pending_summary": current_summary,
        })

    except Exception as exc:
        app.logger.exception("DTS chat request failed: %s", exc)
        return jsonify({
            "status": "error",
            "reply": (
                "Kshama karein, temporary connection issue hua. "
                "Aap apna message dobara bhej sakte hain."
            ),
            "whatsapp_link": None,
            "whatsapp_ready": False,
            "mobile_verified": False,
        }), 500


if __name__ == "__main__":
    app.run(
        debug=False,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )
