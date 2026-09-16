from flask import Flask, Response, request
import requests
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # CORS policy ko bypass karne ke liye

@app.route('/get-image')
def proxy_image():
    img_url = request.args.get('url')
    if not img_url:
        return "Image URL missing", 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': img_url
        }
        
        response = requests.get(img_url, headers=headers, stream=True, timeout=10)
        
        if response.status_code == 200:
            return Response(
                response.content,
                content_type=response.headers.get('content-type', 'image/jpeg')
            )
        else:
            return "Failed to fetch image", response.status_code
            
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)