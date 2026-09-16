from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import BlipProcessor, BlipForConditionalGeneration
from deep_translator import GoogleTranslator
from PIL import Image
import pytesseract
import base64
import io

app = Flask(__name__)
CORS(app)

# Load BLIP model for image captioning
print("Loading BLIP model...")
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
print("Model loaded successfully!")

# Configure Tesseract path (uncomment and adjust for Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@app.route('/caption', methods=['POST'])
def caption_image():
    """Generate image caption and translate"""
    try:
        print("Received caption request...")
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_base64 = data['image']
        language = data.get('language', 'en')
        
        print(f"Processing image for language: {language}")
        
        # Decode image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Generate caption
        text = "You are seeing a"
        inputs = processor(image, text, return_tensors="pt")
        out = model.generate(**inputs)
        caption = processor.decode(out[0], skip_special_tokens=True)
        
        print(f"Generated caption: {caption}")
        
        # Translate if not English
        translated = caption
        if language != 'en':
            try:
                translated = GoogleTranslator(source='en', target=language).translate(caption)
                print(f"Translated: {translated}")
            except Exception as e:
                print(f"Translation error: {e}")
        
        return jsonify({
            'caption': caption,
            'translated': translated,
            'language': language,
            'status': 'success'
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/ocr', methods=['POST'])
def ocr_image():
    """Extract text from image using OCR"""
    try:
        print("Received OCR request...")
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_base64 = data['image']
        language = data.get('language', 'en')
        
        print(f"Processing OCR for language: {language}")
        
        # Decode image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Configure OCR language
        # Language codes: eng, hin, kan, tam, tel, fra
        lang_map = {
            'en': 'eng',
            'hi': 'hin+eng',
            'kn': 'kan+eng',
            'ta': 'tam+eng',
            'te': 'tel+eng',
            'fr': 'fra+eng'
        }
        
        tesseract_lang = lang_map.get(language, 'eng')
        
        # Extract text
        text = pytesseract.image_to_string(image, lang=tesseract_lang)
        
        if not text.strip():
            text = "No text detected in the image"
        
        print(f"Extracted text: {text}")
        
        # Translate if needed
        translated = text
        if language != 'en' and text != "No text detected in the image":
            try:
                # Split into chunks if text is long
                if len(text) > 500:
                    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
                    translated_chunks = []
                    for chunk in chunks:
                        translated_chunk = GoogleTranslator(source='auto', target=language).translate(chunk)
                        translated_chunks.append(translated_chunk)
                    translated = ' '.join(translated_chunks)
                else:
                    translated = GoogleTranslator(source='auto', target=language).translate(text)
                print(f"Translated: {translated}")
            except Exception as e:
                print(f"Translation error: {e}")
        
        return jsonify({
            'text': text,
            'translated': translated,
            'language': language,
            'status': 'success'
        })
    
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Backend is running',
        'features': ['caption', 'ocr']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)