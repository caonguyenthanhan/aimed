import os
import json
import argparse
import requests

def get_headers():
    h = {"ngrok-skip-browser-warning": "true"}
    auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
    if auth:
        h["Authorization"] = auth
    return h

def test_chat_completions(base):
    url = f"{base.rstrip('/')}/v1/chat/completions"
    body = {
        "model": "flash",
        "messages": [
            {"role": "system", "content": "Bạn là trợ lý y tế, trả lời bằng tiếng Việt."},
            {"role": "user", "content": "Xin chào, tôi bị đau đầu nhẹ và ho khan."}
        ],
        "temperature": 0.3,
        "max_tokens": 256
    }
    r = requests.post(url, headers={**get_headers(), "Content-Type": "application/json"}, data=json.dumps(body), timeout=60)
    print("chat_completions status:", r.status_code)
    try:
        data = r.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        print("chat_completions content:", content[:200])
    except Exception:
        print("chat_completions raw:", r.text[:200])

def test_chat_simple(base):
    url = f"{base.rstrip('/')}/v1/chat"
    body = {
        "messages": [
            {"role": "system", "content": "Bạn là trợ lý y tế, trả lời bằng tiếng Việt."},
            {"role": "user", "content": "Tôi bị sốt 38 độ, nên làm gì?"}
        ]
    }
    r = requests.post(url, headers={**get_headers(), "Content-Type": "application/json"}, data=json.dumps(body), timeout=60)
    print("chat status:", r.status_code)
    try:
        data = r.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "") or data.get("reply", "")
        print("chat content:", str(content)[:200])
    except Exception:
        print("chat raw:", r.text[:200])

def test_gpu_metrics(base):
    url = f"{base.rstrip('/')}/gpu/metrics"
    r = requests.get(url, headers=get_headers(), timeout=15)
    print("gpu_metrics status:", r.status_code)
    try:
        print("gpu_metrics data:", json.dumps(r.json(), ensure_ascii=False))
    except Exception:
        print("gpu_metrics raw:", r.text[:200])

def test_tts_stream(base):
    url = f"{base.rstrip('/')}/v1/tts/stream"
    body = {"text": "Xin chào, đây là kiểm thử tổng hợp tiếng nói.", "lang": "vi"}
    with requests.post(url, headers={**get_headers(), "Content-Type": "application/json"}, data=json.dumps(body), timeout=120, stream=True) as resp:
        print("tts_stream status:", resp.status_code)
        count = 0
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                obj = json.loads(line.decode("utf-8"))
                print("tts_stream chunk:", obj.get("chunk_id"))
            except Exception:
                print("tts_stream raw line:", line[:60])
            count += 1
            if count >= 2:
                break

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=str, default=os.environ.get("DEFAULT_GPU_URL", "https://miyoko-trichomonadal-reconditely.ngrok-free.dev"))
    args = parser.parse_args()
    base = args.base
    print("Base:", base)
    test_gpu_metrics(base)
    test_chat_completions(base)
    test_chat_simple(base)
    try:
        test_tts_stream(base)
    except Exception as e:
        print("tts_stream error:", str(e))

if __name__ == "__main__":
    main()
