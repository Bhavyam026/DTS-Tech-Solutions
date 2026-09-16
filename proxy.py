from flask import Flask, Response, request
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # CORS policy ko bypass karne ke liye

@app.route('/get-image')
def proxy_image():
    # URL parameter se image ka link lenge
    img_url = request.args.get('url')
    if not img_url:
        return "Image URL missing", 400

    try:
        # Headers add karenge taaki target server ko lage ki request normal browser se aa rahi hai
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': img_url
        }
        
        # Image ko fetch karenge
        response = requests.get(img_url, headers=headers, stream=True)
        
        if response.status_code == 200:
            # Browser ko wahi image return kar denge
            return Response(
                response.content,
                content_type=response.headers.get('content-type', 'image/jpeg')
            )
        else:
            return "Failed to fetch image", response.status_code
            
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    # Python server localhost port 5000 par chalega
    app.run(host='0.0.0.0', port=5000)