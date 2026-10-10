import os
import urllib.parse
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

# Secure API Key Check & Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("CRITICAL ERROR: GEMINI_API_KEY environment variable is missing!")

genai.configure(api_key=GEMINI_API_KEY)

# Strict Non-Looping, Helpful Sales Assistant Instruction
SYSTEM_INSTRUCTION = """
You are a smart, professional, and friendly technical sales assistant for DTS (Dynamic Technology Solutions), Boisar. You handle enquiries for CCTV, Networking, IT Infrastructure, Electrical, Fire Safety, and Access Control.

CORE RULES:
1. **NO PRICING:** Never quote or guess any price/cost. If asked about cost, reply strictly: "Pricing aur exact cost ke liye kripya hamare owner/expert se direct baat karein."
2. **NO ROBOTIC LOOPS:** Never repeat repetitive checklist phrases like "Aapki requirement ka context mere paas hai" or "next detail pending hai". Always reply naturally, cheerfully, and directly to what the customer says.
3. **NATURAL CONVERSATION & HANDOFF:** When a customer shares their requirement (e.g., 5 CCTV outdoor, MIDC Boisar), acknowledge it warmly, summarize their details, and let them know their requirement is ready to be sent to the DTS expert via WhatsApp.
"""

generation_config = {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 300,
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction=SYSTEM_INSTRUCTION
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat_api():
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({"error": "Invalid request payload."}), 400

        messages = data.get('messages', [])
        if not messages:
            return jsonify({"error": "No messages provided."}), 400

        latest_message = messages[-1].get('content', '').strip()
        
        # Format clean history for Gemini
        gemini_history = []
        for msg in messages[:-1]:
            role = "user" if msg.get('role') == 'user' else "model"
            content = msg.get('content', '')
            gemini_history.append({"role": role, "parts": [content]})

        # Start chat and get response
        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(latest_message)
        bot_reply = response.text

        # Absolute Backend Anti-Loop Guard: Strip any accidental loop phrases
        loop_phrases = ["context mere paas hai", "next detail pending hai", "camera quantity, indoor/outdoor"]
        if any(phrase in bot_reply.lower() for phrase in loop_phrases):
            bot_reply = "Aapki saari details note ho chuki hain! Hamare expert jald hi aapse contact karenge. Aap is requirement ko WhatsApp par seedha bhej sakte hain."

        whatsapp_sent = False
        whatsapp_number = "918390909845" # DTS WhatsApp Number
        
        # Check if customer requirement is substantial or confirmed
        confirmation_keywords = ["yes", "confirm", "bhej do", "send", "theek hai", "ok", "haan", "done", "sab barabar hai", "boisar", "midc", "cctv"]
        is_ready = any(word in latest_message.lower() for word in confirmation_keywords) or len(messages) >= 4
        
        pending_summary = data.get('pending_summary', '')
        if is_ready:
            history_text = "\n".join([f"{m.get('role')}: {m.get('content')}" for m in messages])
            raw_msg = f"Hello DTS Owner, here is the confirmed customer requirement summary from AI chat:\n\n{history_text}"
            encoded_msg = urllib.parse.quote(raw_msg)
            whatsapp_link = f"https://wa.me/{whatsapp_number}?text={encoded_msg}"
            
            if "whatsapp" not in bot_reply.lower():
                bot_reply += f"\n\n✨ Aapki requirement taiyar hai! Owner ko WhatsApp par bhejne ke liye yahan click karein: {whatsapp_link}"
                whatsapp_sent = True

        return jsonify({
            "reply": bot_reply,
            "pending_summary": pending_summary,
            "whatsapp_sent": whatsapp_sent
        })

    except Exception as e:
        print(f"Backend Error: {e}")
        return jsonify({
            "error": "Kshama karein, connection refresh ho gaya tha. Kripya apna message dobara bhejein."
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
