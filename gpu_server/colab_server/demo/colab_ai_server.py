import os
import sys
import time
import threading
import subprocess

def ensure(import_name, pip_name=None):
    try:
        __import__(import_name)
        return
    except Exception:
        name = pip_name or import_name
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', name])

ensure('fastapi')
ensure('uvicorn')
ensure('huggingface_hub')
try:
    __import__('llama_cpp')
except Exception:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'llama-cpp-python'])
try:
    __import__('pyngrok')
except Exception:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyngrok'])

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
import uvicorn

repo = os.environ.get('GGUF_REPO', 'Qwen/Qwen2.5-1.5B-Instruct-GGUF')
file = os.environ.get('GGUF_FILE', 'Qwen2.5-1.5B-Instruct-Q5_0.gguf')
ctx = int(os.environ.get('LLAMA_CTX', '4096'))
threads = int(os.environ.get('LLAMA_THREADS', '4'))
model_path = hf_hub_download(repo_id=repo, filename=file)
llm = Llama(model_path=model_path, n_ctx=ctx, n_threads=threads)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.get('/v1/models')
def models():
    return {'data': [{'id': file, 'repo': repo}]}

@app.post('/v1/chat/completions')
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get('messages') or []
    prompt = body.get('prompt') or body.get('question') or body.get('message') or ''
    temperature = float(body.get('temperature', 0.2))
    max_tokens = int(body.get('max_tokens', 512))
    system = body.get('system') or 'Bạn là trợ lý tư vấn y tế an toàn, trả lời bằng tiếng Việt.'
    if not messages:
        messages = [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}]
    else:
        messages = [{'role': 'system', 'content': system}] + messages
    try:
        r = llm.create_chat_completion(messages=messages, temperature=temperature, max_tokens=max_tokens)
        text = r['choices'][0]['message']['content']
        return {'choices': [{'message': {'role': 'assistant', 'content': text}}]}
    except Exception:
        joined = system + '\n' + '\n'.join([m.get('content', '') for m in messages if m.get('content')])
        r = llm(joined, temperature=temperature, max_tokens=max_tokens)
        if isinstance(r, dict) and 'choices' in r and len(r['choices']) > 0:
            text = r['choices'][0].get('text', '')
        else:
            text = ''
        return {'choices': [{'message': {'role': 'assistant', 'content': text}}]}

def start_server():
    port = int(os.environ.get('PORT', '8000'))
    uvicorn.run(app, host='0.0.0.0', port=port, log_level='info')

def expose():
    port = int(os.environ.get('PORT', '8000'))
    api_base = ''
    try:
        from pyngrok import ngrok
        token = os.environ.get('NGROK_TOKEN', '')
        if token:
            ngrok.set_auth_token(token)
        tunnel = ngrok.connect(port)
        api_base = tunnel.public_url
    except Exception:
        api_base = f'http://127.0.0.1:{port}'
    print(f'API_BASE={api_base}')
    return api_base

if __name__ == '__main__':
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    time.sleep(2)
    expose()
    while True:
        time.sleep(3600)

