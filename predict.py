from flask import Flask, request, jsonify
import base64
from flask_cors import CORS
from PIL import Image
from io import BytesIO
from werkzeug.utils import secure_filename  
import os

app = Flask(__name__)
CORS(app)
D_DRIVE_DIRECTORY = 'D:/images/'

@app.route('/save-image', methods=['POST'])
def save_image():
    if 'templateId' not in request.form:
        return jsonify({'error': 'Missing templateId'}), 400

    template_id = request.form['templateId']

    # Determine the source file path using the template ID
    source_file_path = os.path.join('templates', f'{template_id}.webp')
    target_file_path = os.path.join(D_DRIVE_DIRECTORY, f'{template_id}.webp')

    # Copy the file to the target directory on D drive
    try:
        if not os.path.exists(source_file_path):
            return jsonify({'error': 'Template file not found'}), 404

        shutil.copy(source_file_path, target_file_path)
        return jsonify({'message': 'File copied successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)