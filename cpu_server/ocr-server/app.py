# app.py

import torch
import os
import base64
import io
import gc
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
from transformers import AutoModel, AutoTokenizer
from ocr_processing import (
    load_image, extract_cccd_info, extract_business_license_info, 
    extract_ocop_info, clean_gpu_resources
)

# --- CẤU HÌNH VÀ TẢI MODEL ---

# Đường dẫn mà Dockerfile sẽ tải model vào
MODEL_ID = "5CD-AI/Vintern-1B-v2"
MODEL_PATH = f"./model_cache/{MODEL_ID}"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

if DEVICE == "cpu":
    print("CẢNH BÁO: Không tìm thấy GPU. Model này chạy rất chậm trên CPU.")

def load_model_and_tokenizer():
    """
    Tải model và tokenizer một lần duy nhất khi khởi động.
    """
    print(f"Bắt đầu tải model: {MODEL_ID} từ {MODEL_PATH}...")
    try:
        model = AutoModel.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        ).eval().to(DEVICE)
        
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_PATH, 
            trust_remote_code=True, 
            use_fast=False
        )
        print("✅ Tải model và tokenizer thành công.")
        return model, tokenizer
    except Exception as e:
        print(f"LỖI NGHIÊM TRỌNG: Không thể tải model. {e}")
        return None, None

# Tải model vào biến toàn cục
model, tokenizer = load_model_and_tokenizer()

app = Flask(__name__)
CORS(app) # Cho phép gọi API từ tên miền khác

# --- ĐỊNH NGHĨA API ---

@app.route('/api/v1/ocr', methods=['POST'])
def handle_ocr_request():
    if not model or not tokenizer:
        return jsonify({"error": "Máy chủ chưa sẵn sàng, model chưa được tải."}), 503

    try:
        data = request.get_json()
        if 'images' not in data or not isinstance(data['images'], list):
            return jsonify({"error": "Payload không hợp lệ. Cần có key 'images' là một list."}), 400

        # Phân loại các ảnh theo type
        cccd_inputs = []
        gpkd_paths = []
        ocop_paths = []
        
        temp_files_to_clean = []
        results = {}

        # 1. Giải mã và lưu tạm ảnh
        for img_data in data['images']:
            img_type = img_data.get('type')
            img_b64 = img_data.get('image_b64')

            if not img_type or not img_b64:
                continue

            try:
                # Giải mã base64
                img_bytes = base64.b64decode(img_b64)
                img_file = io.BytesIO(img_bytes)
                
                # Lưu tạm để hàm load_image của bạn có thể đọc
                temp_path_str = f"temp_img_{os.urandom(8).hex()}.jpg"
                temp_path = Path(temp_path_str)
                with open(temp_path, 'wb') as f:
                    f.write(img_file.getbuffer())
                
                temp_files_to_clean.append(temp_path)

                # Sắp xếp ảnh vào các nhóm xử lý
                if img_type == 'font':
                    cccd_inputs.append(("front", temp_path))
                elif img_type == 'back':
                    cccd_inputs.append(("back", temp_path))
                elif img_type == 'bu-li':
                    gpkd_paths.append(temp_path)
                elif img_type == 'ocop':
                    ocop_paths.append(temp_path)

            except Exception as e:
                print(f"Lỗi giải mã ảnh: {e}")
                
        # 2. Xử lý từng nhóm
        if cccd_inputs:
            print(f"Đang xử lý {len(cccd_inputs)} ảnh CCCD...")
            cccd_result = extract_cccd_info(cccd_inputs, model=model, tokenizer=tokenizer, device=DEVICE)
            results['cccd'] = cccd_result

        if gpkd_paths:
            print(f"Đang xử lý {len(gpkd_paths)} ảnh GPKD...")
            gpkd_result = extract_business_license_info(gpkd_paths, model=model, tokenizer=tokenizer)
            results['business_license'] = gpkd_result

        if ocop_paths:
            print(f"Đang xử lý {len(ocop_paths)} ảnh OCOP...")
            ocop_result = extract_ocop_info(ocop_paths, model=model, tokenizer=tokenizer)
            results['ocop'] = ocop_result

        return jsonify(results), 200

    except Exception as e:
        print(f"Lỗi máy chủ: {e}")
        return jsonify({"error": f"Đã xảy ra lỗi máy chủ: {str(e)}"}), 500
    
    finally:
        # Dọn dẹp file tạm
        for f in temp_files_to_clean:
            try:
                os.remove(f)
            except OSError:
                pass
        # Dọn dẹp GPU cache (phòng trường hợp các hàm con bị lỗi trước khi tự dọn dẹp)
        clean_gpu_resources()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)