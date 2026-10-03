import os
import urllib.parse
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

# Secure API Key Check & Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("CRITICAL ERROR: GEMINI_API_KEY environment variable is missing! Please set it before running the app.")

genai.configure(api_key=GEMINI_API_KEY)

# Refined, Natural, and Non-Looping System Instruction
SYSTEM_INSTRUCTION = """
You are a smart, polite, and helpful technical sales assistant and product specialist for DTS (Dynamic Technology Solutions), Boisar. You have deep knowledge of all DTS products, including CCTV Cameras, NVR/DVR, Monitors, Biometric Attendance Systems, Networking Switches, Fire Safety Equipment, Electrical Panels, Projectors, and Boom Barriers.

CORE POLICIES & RULES:
1. **NO PRICING POLICY:** Never reveal, quote, estimate, or guess any prices, rates, or discounts. If asked about cost or price, you must strictly reply: "Pricing aur exact cost ke liye kripya hamare owner/expert se direct baat karein." Never break this rule under any circumstances.
2. **NATURAL CONVERSATION (NO LOOPS):** Never repeat repetitive robotic template phrases like "Aapki requirement ka context mere paas hai" or "next detail pending hai". Always reply naturally, fluently, and directly to whatever the user asks (e.g., explaining hard disk utility, camera placement, or arranging items like a TV/monitor).
3. **TYPO TOLERANCE:** Naturally understand spelling typos (e.g., eletrical, camra, dekstop, hdd, projctor) without pointing them out.
4. **REQUIREMENT GATHERING & HANDOFF:** Smoothly collect required details (location, shop/site type, quantity, specific needs like TV arrangement, and customer name). Once the details are gathered and confirmed, help wrap up the inquiry for WhatsApp handoff.
"""

generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction=SYSTEM_INSTRUCTION
)

# Robust Session Storage
chat_sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "reply": "Invalid request payload."}), 400

        user_message = data.get('message', '').strip()
        session_id = data.get('session_id', 'global_dts_customer_session')
        
        if not user_message:
            return jsonify({"status": "error", "reply": "Kripya apna message likhein."}), 400

        # Initialize session if not present
        if session_id not in chat_sessions:
            chat_sessions[session_id] = model.start_chat(history=[])
            
        chat_session = chat_sessions[session_id]
        
        # Send message to Gemini
        response = chat_session.send_message(user_message)
        bot_reply = response.text
        
        # Backend Anti-Loop Guard: Strip out any accidental repetitive checklist glitch sentences
        loop_phrases = ["context mere paas hai", "next detail pending hai", "camera quantity, indoor/outdoor"]
        if any(phrase in bot_reply.lower() for phrase in loop_phrases):
            bot_reply = "Aapki saari details note ho chuki hain! Hamare expert jald hi aapse contact karenge. Kya aap is requirement ko final karke owner ko WhatsApp par bhejna chahte hain?"

        whatsapp_link = None
        whatsapp_number = "919876543210" # Replace with your actual DTS WhatsApp number with country code (e.g., 919876543210)
        
        # Trigger WhatsApp link when details are sufficiently gathered or user gives confirmation/name
        confirmation_keywords = ["yes", "confirm", "bhej do", "send", "theek hai", "ok", "haan", "sab barabar hai", "done", "bhavya"]
        is_ready = any(word in user_message.lower() for word in confirmation_keywords) or len(chat_session.history) > 6
        
        if is_ready and not any(phrase in bot_reply.lower() for phrase in loop_phrases):
            # Compile full conversation history into a clean summary for the owner
            history_text = "\n".join([f"{m.role}: {m.parts[0].text}" for m in chat_session.history])
            raw_msg = f"Hello DTS Owner, here is the confirmed customer requirement summary from AI chat:\n\n{history_text}"
            encoded_msg = urllib.parse.quote(raw_msg)
            whatsapp_link = f"https://wa.me/{whatsapp_number}?text={encoded_msg}"
            
            # Append a clean prompt for the WhatsApp button if not already in the reply
            if "whatsapp" not in bot_reply.lower() and "button" not in bot_reply.lower():
                bot_reply += "\n\n✨ Aapki requirement taiyar hai! Neeche diye gaye button par click karke aap seedha hamare WhatsApp par detail bhej sakte hain."

        return jsonify({
            "status": "success",
            "reply": bot_reply,
            "whatsapp_link": whatsapp_link
        })
        
    except Exception as e:
        print(f"Backend Error: {e}")
        if session_id in chat_sessions:
            del chat_sessions[session_id]
            
        return jsonify({
            "status": "error",
            "reply": "Kshama karein, connection refresh ho gaya tha. Kripya apna message dobara bhejein."
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
