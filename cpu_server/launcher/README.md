# CPU Server + Ngrok (FastAPI)

## Yêu cầu
- Python 3.10+ (đã cài `requirements.txt`)
- Ngrok CLI (có trong PATH)

## Chạy nhanh (PowerShell)

```powershell
python -m pip install -r cpu_server/requirements.txt
.\cpu_server\launcher\run.ps1 -Port 8000 -Reload
```

Nếu không muốn mở ngrok:

```powershell
.\cpu_server\launcher\run.ps1 -NoNgrok
```

## Biến môi trường
- `NGROK_AUTHTOKEN`: token ngrok (tuỳ chọn, nếu set thì script tự `ngrok config add-authtoken`)
- `NGROK_REGION`: region ngrok (tuỳ chọn)
- `NGROK_DOMAIN`: domain ngrok (tuỳ chọn, gói trả phí)

## Kết quả
- Script sẽ in ra:
  - `CPU server local: http://127.0.0.1:8000`
  - `CPU server public: https://...`
  - `CPU_SERVER_URL=https://...`
- Script cũng tự cập nhật `medical-consultation-app/.env.local` với `CPU_SERVER_URL` để frontend local dùng được ngay.
