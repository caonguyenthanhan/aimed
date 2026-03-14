# Hướng Dẫn Cài Đặt OCR Server

## Yêu Cầu Hệ Thống

### Phần Cứng
- **GPU**: NVIDIA GPU với ít nhất 8GB VRAM (khuyến nghị RTX 3080 trở lên)
- **RAM**: Tối thiểu 16GB, khuyến nghị 32GB
- **Ổ cứng**: Ít nhất 50GB dung lượng trống
- **CPU**: Intel i5 hoặc AMD Ryzen 5 trở lên

### Phần Mềm
- **Hệ điều hành**: Ubuntu 20.04+ / Windows 10+ / macOS 10.15+
- **Python**: 3.8 - 3.11
- **CUDA**: 11.8+ (cho GPU NVIDIA)
- **Docker**: 20.10+ (tùy chọn)

## Phương Pháp Cài Đặt

### Phương Pháp 1: Cài Đặt Trực Tiếp

#### Bước 1: Chuẩn Bị Môi Trường

```bash
# Tạo virtual environment
python -m venv ocr_env

# Kích hoạt virtual environment
# Trên Linux/macOS:
source ocr_env/bin/activate
# Trên Windows:
ocr_env\Scripts\activate

# Cập nhật pip
pip install --upgrade pip
```

#### Bước 2: Cài Đặt Dependencies

```bash
# Cài đặt PyTorch với CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Cài đặt các thư viện khác
pip install -r requirements.txt
```

#### Bước 3: Tải Model

```bash
# Model sẽ được tự động tải khi chạy lần đầu
# Hoặc có thể tải trước bằng Python:
python -c "
from transformers import AutoTokenizer, AutoModel
model_path = '5CD-AI/Vintern-1B-v2'
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
model = AutoModel.from_pretrained(model_path, trust_remote_code=True)
print('Model downloaded successfully')
"
```

#### Bước 4: Chạy Server

```bash
# Chạy server development
python ocr_api.py

# Hoặc chạy với gunicorn (production)
gunicorn --bind 0.0.0.0:5000 --workers 1 --timeout 300 ocr_api:app
```

### Phương Pháp 2: Sử Dụng Docker

#### Bước 1: Build Docker Image

```bash
# Build image
docker build -t ocr-server .

# Hoặc với tag cụ thể
docker build -t ocr-server:v1.0 .
```

#### Bước 2: Chạy Container

```bash
# Chạy với GPU support
docker run --gpus all -p 5000:5000 -v $(pwd)/logs:/app/logs ocr-server

# Chạy với environment variables
docker run --gpus all -p 5000:5000 \
  -e MODEL_PATH="5CD-AI/Vintern-1B-v2" \
  -e CUDA_VISIBLE_DEVICES=0 \
  -v $(pwd)/logs:/app/logs \
  ocr-server
```

#### Bước 3: Sử Dụng Docker Compose (Tùy chọn)

Tạo file `docker-compose.yml`:

```yaml
version: '3.8'
services:
  ocr-server:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MODEL_PATH=5CD-AI/Vintern-1B-v2
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./logs:/app/logs
      - ./temp_uploads:/app/temp_uploads
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

Chạy với Docker Compose:
```bash
docker-compose up -d
```

## Cấu Hình

### Biến Môi Trường

Tạo file `.env`:

```env
# Model configuration
MODEL_PATH=5CD-AI/Vintern-1B-v2
CUDA_VISIBLE_DEVICES=0

# Flask configuration
FLASK_ENV=production
FLASK_DEBUG=False

# Server configuration
HOST=0.0.0.0
PORT=5000
MAX_CONTENT_LENGTH=16777216  # 16MB

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/ocr_server.log
```

### Cấu Hình Nginx (Production)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

## Kiểm Tra Cài Đặt

### Kiểm Tra Health Check

```bash
curl http://localhost:5000/health
```

Kết quả mong đợi:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "gpu_available": true,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Kiểm Tra API Endpoints

```bash
# Kiểm tra danh sách document types
curl http://localhost:5000/ocr/types

# Test với ảnh mẫu
curl -X POST http://localhost:5000/ocr/raw \
  -F "type=front" \
  -F "images=@sample_cccd_front.jpg"
```

## Xử Lý Sự Cố

### Lỗi Thường Gặp

#### 1. CUDA Out of Memory
```
RuntimeError: CUDA out of memory
```

**Giải pháp:**
- Giảm batch size
- Sử dụng GPU có VRAM lớn hơn
- Thêm cấu hình `torch.cuda.empty_cache()`

#### 2. Model Loading Error
```
OSError: Can't load tokenizer for '5CD-AI/Vintern-1B-v2'
```

**Giải pháp:**
- Kiểm tra kết nối internet
- Xóa cache và tải lại: `rm -rf ~/.cache/huggingface/`
- Tải model thủ công

#### 3. Permission Denied
```
PermissionError: [Errno 13] Permission denied
```

**Giải pháp:**
- Kiểm tra quyền thư mục: `chmod 755 temp_uploads logs`
- Chạy với quyền admin nếu cần thiết

### Logs và Monitoring

```bash
# Xem logs realtime
tail -f logs/ocr_server.log

# Kiểm tra GPU usage
nvidia-smi

# Kiểm tra memory usage
free -h
```

## Tối Ưu Hiệu Suất

### 1. GPU Optimization
```python
# Trong file cấu hình
torch.backends.cudnn.benchmark = True
torch.backends.cudnn.deterministic = False
```

### 2. Memory Management
```python
# Thêm vào ocr_api.py
import gc
torch.cuda.empty_cache()
gc.collect()
```

### 3. Load Balancing
- Sử dụng nhiều worker processes
- Implement queue system cho requests
- Cache model predictions

## Bảo Mật

### 1. API Security
- Implement API key authentication
- Rate limiting
- Input validation

### 2. File Security
- Scan uploaded files
- Limit file types
- Auto-cleanup temporary files

### 3. Network Security
- Use HTTPS
- Firewall configuration
- VPN access

## Backup và Recovery

### 1. Model Backup
```bash
# Backup model cache
tar -czf model_backup.tar.gz ~/.cache/huggingface/
```

### 2. Configuration Backup
```bash
# Backup configuration
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

### 3. Logs Backup
```bash
# Rotate logs
logrotate /etc/logrotate.d/ocr-server
```

## Liên Hệ Hỗ Trợ

- **Email**: support@yourcompany.com
- **Documentation**: https://docs.yourcompany.com
- **Issues**: https://github.com/yourcompany/ocr-server/issues

## Phiên Bản

- **Current Version**: 1.0.0
- **Last Updated**: 2024-01-01
- **Compatibility**: Python 3.8+, CUDA 11.8+