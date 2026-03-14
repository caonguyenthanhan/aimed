"""OCR API Server for Vietnamese Document Processing
Supports CCCD (front/back), OCOP certificates, and Business licenses
"""

import os
import io
import json
import base64
import torch
from pathlib import Path
from typing import List, Dict, Any, Union
from PIL import Image
import tempfile
import shutil
import logging

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from transformers import AutoTokenizer, AutoModel

# Import OCR processing functions (extracted from notebook)
from ocr_processor import (
    load_image, 
    extract_cccd_info, 
    extract_ocop_info, 
    extract_business_license_info,
    clean_gpu_resources,
    filter_and_clean_response
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
UPLOAD_FOLDER = 'temp_uploads'
MODEL_ID = "5CD-AI/Vintern-1B-v2"

# Global variables for model
model = None
tokenizer = None
device = None

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def initialize_model():
    """Initialize the OCR model and tokenizer"""
    global model, tokenizer, device
    
    try:
        logger.info("Initializing OCR model...")
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {device}")
        
        # Load model and tokenizer
        model_path = os.getenv('MODEL_PATH', MODEL_ID)
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True, use_fast=False)
        model = AutoModel.from_pretrained(
            model_path,
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
            use_flash_attn=True,
            trust_remote_code=True
        ).eval().to(device)
        
        logger.info(f"Model loaded successfully on {device}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        return False

def validate_document_type(doc_type: str) -> bool:
    """Validate document type"""
    valid_types = ['front', 'back', 'ocop', 'bu-li']
    return doc_type.lower() in valid_types

def save_uploaded_file(file, doc_type: str) -> Path:
    """Save uploaded file to temporary directory"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    
    filename = secure_filename(file.filename)
    if not filename:
        filename = f"{doc_type}_{hash(file.read())}.jpg"
        file.seek(0)  # Reset file pointer
    
    filepath = Path(UPLOAD_FOLDER) / filename
    file.save(str(filepath))
    return filepath

def save_base64_image(base64_data: str, doc_type: str) -> Path:
    """Save base64 encoded image to temporary directory"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    
    # Remove data URL prefix if present
    if ',' in base64_data:
        base64_data = base64_data.split(',')[1]
    
    # Decode base64 data
    image_data = base64.b64decode(base64_data)
    image = Image.open(io.BytesIO(image_data))
    
    # Save image
    filename = f"{doc_type}_{hash(base64_data)}.jpg"
    filepath = Path(UPLOAD_FOLDER) / filename
    image.save(str(filepath))
    return filepath

def process_documents(image_paths_with_types: List[tuple]) -> Dict[str, Any]:
    """Process documents based on their types"""
    try:
        # Group images by document type
        cccd_images = []
        ocop_images = []
        business_license_images = []
        
        for doc_type, image_path in image_paths_with_types:
            if doc_type in ['front', 'back']:
                cccd_images.append((doc_type, image_path))
            elif doc_type == 'ocop':
                ocop_images.append(image_path)
            elif doc_type == 'bu-li':
                business_license_images.append(image_path)
        
        results = {}
        
        # Process CCCD documents
        if cccd_images:
            try:
                cccd_result = extract_cccd_info(cccd_images, model, tokenizer, device)
                results['cccd'] = {
                    'status': 'success',
                    'data': cccd_result,
                    'type': 'cccd'
                }
            except Exception as e:
                results['cccd'] = {
                    'status': 'error',
                    'error': str(e),
                    'type': 'cccd'
                }
        
        # Process OCOP documents
        if ocop_images:
            try:
                ocop_result = extract_ocop_info(ocop_images, model, tokenizer)
                results['ocop'] = {
                    'status': 'success',
                    'data': ocop_result,
                    'type': 'ocop'
                }
            except Exception as e:
                results['ocop'] = {
                    'status': 'error',
                    'error': str(e),
                    'type': 'ocop'
                }
        
        # Process Business License documents
        if business_license_images:
            try:
                business_result = extract_business_license_info(business_license_images, model, tokenizer)
                results['business_license'] = {
                    'status': 'success',
                    'data': business_result,
                    'type': 'business_license'
                }
            except Exception as e:
                results['business_license'] = {
                    'status': 'error',
                    'error': str(e),
                    'type': 'business_license'
                }
        
        return {
            'status': 'success',
            'results': results,
            'total_processed': len(image_paths_with_types)
        }
        
    except Exception as e:
        logger.error(f"Error processing documents: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'total_processed': 0
        }

def cleanup_temp_files(file_paths: List[Path]):
    """Clean up temporary files"""
    for file_path in file_paths:
        try:
            if file_path.exists():
                os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not remove temp file {file_path}: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'gpu_available': torch.cuda.is_available(),
        'device': str(device) if device else None,
        'model_id': MODEL_ID,
        'supported_types_count': 4
    })

@app.route('/ocr/raw', methods=['POST'])
def ocr_raw_data():
    """
    OCR endpoint for raw file uploads
    Supports two formats:
    1) Legacy: multipart/form-data with 'files'[] and matching 'types'[]
    2) New: multipart/form-data with 'images'[] and single 'type'
    """
    try:
        files = []
        types = []

        if 'files' in request.files:
            files = request.files.getlist('files')
            types = request.form.getlist('types')
            if len(files) != len(types):
                return jsonify({'error': 'Number of files must match number of types'}), 400
        elif 'images' in request.files:
            files = request.files.getlist('images')
            single_type = request.form.get('type')
            if not single_type:
                return jsonify({'error': "Missing 'type' for images"}), 400
            types = [single_type] * len(files)
        else:
            return jsonify({'error': 'No files provided'}), 400

        if not files or files[0].filename == '':
            return jsonify({'error': 'No files selected'}), 400
        
        # Validate file types and document types
        temp_files = []
        image_paths_with_types = []
        
        for file, doc_type in zip(files, types):
            if not allowed_file(file.filename):
                return jsonify({'error': f'File type not allowed: {file.filename}'}), 400
            
            if not validate_document_type(doc_type):
                return jsonify({'error': f'Invalid document type: {doc_type}'}), 400
            
            # Save file temporarily
            file_path = save_uploaded_file(file, doc_type)
            temp_files.append(file_path)
            image_paths_with_types.append((doc_type.lower(), file_path))
        
        # Process documents
        results = process_documents(image_paths_with_types)
        
        # Cleanup temporary files
        cleanup_temp_files(temp_files)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ocr/json', methods=['POST'])
def ocr_json_data():
    """
    OCR endpoint for JSON data with base64 encoded images
    Expects JSON: {"documents": [{"type": "front", "image": "base64_data"}, ...]}
    """
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        if 'documents' not in data:
            return jsonify({'error': 'Missing documents field'}), 400
        
        documents = data['documents']
        if not isinstance(documents, list) or not documents:
            return jsonify({'error': 'Documents must be a non-empty list'}), 400
        
        # Validate and process documents
        temp_files = []
        image_paths_with_types = []
        
        for doc in documents:
            if not isinstance(doc, dict) or 'type' not in doc or 'image' not in doc:
                return jsonify({'error': 'Each document must have type and image fields'}), 400
            
            doc_type = doc['type']
            image_data = doc['image']
            
            if not validate_document_type(doc_type):
                return jsonify({'error': f'Invalid document type: {doc_type}'}), 400
            
            # Save base64 image temporarily
            try:
                file_path = save_base64_image(image_data, doc_type)
                temp_files.append(file_path)
                image_paths_with_types.append((doc_type.lower(), file_path))
            except Exception as e:
                return jsonify({'error': f'Invalid image data: {str(e)}'}), 400
        
        # Process documents
        results = process_documents(image_paths_with_types)
        
        # Cleanup temporary files
        cleanup_temp_files(temp_files)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ocr/types', methods=['GET'])
def get_supported_types():
    """Get supported document types"""
    return jsonify({
        'supported_types': [
            {
                'type': 'front',
                'description': 'Mặt trước CCCD',
                'category': 'cccd'
            },
            {
                'type': 'back', 
                'description': 'Mặt sau CCCD',
                'category': 'cccd'
            },
            {
                'type': 'ocop',
                'description': 'Chứng nhận OCOP',
                'category': 'certificate'
            },
            {
                'type': 'bu-li',
                'description': 'Giấy phép kinh doanh',
                'category': 'business_license'
            }
        ]
    })

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize model on startup
    initialize_model()
    
    # Create upload directory
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"Starting OCR API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)