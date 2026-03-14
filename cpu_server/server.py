# FastAPI server that wraps a local llama.cpp GGUF model via llama-cpp-python
from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import asyncio
import tempfile
import datetime
import uuid
import subprocess
import sys
from pathlib import Path

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

try:
    from llama_cpp import Llama
    from llama_cpp.llama_chat_format import Llava15ChatHandler
except Exception:
    Llama = None
    Llava15ChatHandler = None

try:
    from PIL import Image
    import base64
    from io import BytesIO
except ImportError:
    Image = None
    base64 = None
    BytesIO = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

import requests
try:
    import jwt
except Exception:
    jwt = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None

# Import audio utilities
try:
    from .audio_utils import AudioChunker, ParallelSpeechRecognizer, TextChunker
except Exception:
    try:
        from audio_utils import AudioChunker, ParallelSpeechRecognizer, TextChunker
    except Exception:
        AudioChunker = None
        ParallelSpeechRecognizer = None
        TextChunker = None

# MODEL_RELATIVE_PATH = os.path.join("models", "Llama-3.2-1B-Instruct-IQ3_M.gguf")
PRO_MODEL_PATH = os.path.abspath(os.path.join(REPO_ROOT, "models", "Llama-3.2-3B-Instruct-Q8_0.gguf"))
FLASH_MODEL_PATH = os.path.abspath(os.path.join(REPO_ROOT, "models", "Llama-3.2-1B-Instruct-Q6_K_L.gguf"))

# VLM Model paths
VLM_MODEL_PATH = os.path.abspath(os.path.join(REPO_ROOT, "models", "llava-v1.5-7b-Q6_K.gguf"))
VLM_CLIP_MODEL_PATH = os.path.abspath(os.path.join(REPO_ROOT, "models", "llava-v1.5-7b-mmproj-model-f16.gguf"))

LLAMA_SERVER_URL = os.environ.get("LLAMA_SERVER_URL", "http://127.0.0.1:8080")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")

if os.name == "nt":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

def _front_data_dir():
    return os.path.join(REPO_ROOT, "medical-consultation-app", "data")

def _get_proxy_base():
    try:
        p_mode = os.path.join(_front_data_dir(), "runtime-mode.json")
        if os.path.exists(p_mode):
            with open(p_mode, "r", encoding="utf-8") as f:
                mode = json.load(f)
            if str(mode.get("target")) == "gpu" and mode.get("gpu_url"):
                return str(mode.get("gpu_url"))
    except Exception:
        pass
    env = os.environ.get("LLAMA_SERVER_URL", "").strip()
    if env:
        return env
    try:
        p = os.path.join(_front_data_dir(), "server-registry.json")
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                reg = json.load(f)
            servers = reg.get("servers", [])
            active = [s for s in servers if s.get("status") == "active"]
            cand = sorted(active or servers, key=lambda s: s.get("updated_at", ""), reverse=True)
            if cand:
                return cand[0].get("url", LLAMA_SERVER_URL)
    except Exception:
        pass
    default_gpu = os.environ.get("DEFAULT_GPU_URL", "https://miyoko-trichomonadal-reconditely.ngrok-free.dev")
    return default_gpu or LLAMA_SERVER_URL

_LB_INDEX = 0
def _choose_gpu_url(round_robin: bool = False) -> str:
    if not round_robin:
        return _get_proxy_base()
    try:
        p = os.path.join(_front_data_dir(), "server-registry.json")
        urls = []
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                reg = json.load(f)
            servers = reg.get("servers", [])
            active = [s for s in servers if s.get("status") == "active" and s.get("url")]
            candidates = active or [s for s in servers if s.get("url")]
            urls = [str(s.get("url")) for s in candidates]
        if not urls:
            return _get_proxy_base()
        global _LB_INDEX
        _LB_INDEX = (_LB_INDEX + 1) % len(urls)
        return urls[_LB_INDEX]
    except Exception:
        return _get_proxy_base()

def _current_target():
    try:
        pdir = _front_data_dir()
        mode_path = os.path.join(pdir, "runtime-mode.json")
        if os.path.exists(mode_path):
            with open(mode_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            t = str(data.get("target", "cpu")).lower()
            return "gpu" if t == "gpu" else "cpu"
    except Exception:
        pass
    return "gpu"

@asynccontextmanager
async def lifespan(app: FastAPI):
    await _setup_event_loop_handler()
    await load_model()
    yield

app = FastAPI(title="Local LLaMA Chat API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3033", "http://127.0.0.1:3033",
        "http://localhost:3034", "http://127.0.0.1:3034"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def _setup_event_loop_handler():
    try:
        loop = asyncio.get_running_loop()
        def _handler(context: dict):
            exc = context.get("exception")
            if isinstance(exc, ConnectionResetError):
                return
            try:
                loop.default_exception_handler(context)
            except Exception:
                pass
        loop.set_exception_handler(_handler)
    except Exception:
        pass

def _gemini_generate_text(messages: List[dict], tier: str, temperature: float, max_tokens: int) -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")
    model_name = os.environ.get("GEMINI_MODEL", "").strip() or "gemini-2.5-flash"
    system_text = ""
    contents = []
    for m in messages:
        role = str(m.get("role") or "").strip().lower()
        content = str(m.get("content") or "")
        if role == "system":
            if content:
                system_text = (system_text + "\n" + content).strip() if system_text else content
            continue
        g_role = "model" if role == "assistant" else "user"
        if content:
            contents.append({"role": g_role, "parts": [{"text": content}]})
    payload = {
        "contents": contents or [{"role": "user", "parts": [{"text": ""}]}],
        "generationConfig": {
            "temperature": float(temperature if temperature is not None else 0.7),
            "maxOutputTokens": int(max_tokens if max_tokens is not None else 512),
        },
    }
    if system_text:
        payload["systemInstruction"] = {"parts": [{"text": system_text}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    r = requests.post(url, params={"key": api_key}, json=payload, timeout=60)
    if not r.ok:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {r.status_code} {r.text[:200]}")
    data = r.json()
    try:
        cand = (data.get("candidates") or [])[0] or {}
        content = (cand.get("content") or {}).get("parts") or []
        text = ""
        for p in content:
            t = p.get("text")
            if isinstance(t, str) and t.strip():
                text += t
        return text.strip()
    except Exception:
        raise HTTPException(status_code=502, detail="Gemini API returned no text")

class ChatMessage(BaseModel):
    role: str  # 'system' | 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    model: Optional[str] = "local-llama"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    prompt: Optional[str] = None
    question: Optional[str] = None
    message: Optional[str] = None
    system: Optional[str] = None
    provider: Optional[str] = None

class ChatChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    choices: List[ChatChoice]
    conversation_id: Optional[str] = None

class TextToSpeechRequest(BaseModel):
    text: str
    lang: Optional[str] = "vi"

class TextToSpeechStreamRequest(BaseModel):
    text: str
    lang: Optional[str] = "vi"

class SpeechToTextResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None

class VisionChatRequest(BaseModel):
    text: str
    image_base64: str
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512

class DocumentChatRequest(BaseModel):
    text: str
    doc_base64: str
    doc_name: str
    model: Optional[str] = "flash"

class VisionChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None

class VisionMultiRequest(BaseModel):
    text: str
    images_base64: List[str]

class HealthLookupRequest(BaseModel):
    query: str
    mode: Optional[str] = None  # 'drug' | 'disease' | 'symptom'
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

class HealthLookupResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    conversation_id: Optional[str] = None
    mode: Optional[str] = None
    redirect_url: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    user_id: str
    token: str

class UserProfile(BaseModel):
    username: str
    has_password: bool

class UserUpdate(BaseModel):
    username: str
    password: Optional[str] = None

class RegisterRequest(BaseModel):
    username: str
    password: str

class GoogleLoginRequest(BaseModel):
    id_token: str

# Load model once at startup
llm_pro: Optional[Llama] = None
llm_flash: Optional[Llama] = None
vlm_llm: Optional[Llama] = None
rag_chat = None
MOCK_CHAT_DB = {}
MOCK_SOCIAL_DB = {}
DATA_DIR = os.path.abspath(os.environ.get("CPU_DATA_DIR", "").strip() or os.path.join(REPO_ROOT, "data"))
USER_FILE = os.path.join(DATA_DIR, "user.json")

def _hash_password(password: str, salt: str) -> str:
    import hashlib
    h = hashlib.sha256()
    h.update((salt + password).encode("utf-8"))
    return h.hexdigest()

def _ensure_user_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(USER_FILE):
        with open(USER_FILE, "w", encoding="utf-8") as f:
            json.dump({"username": "admin", "password_hash": "", "salt": ""}, f, ensure_ascii=False)

def _load_user():
    _ensure_user_file()
    with open(USER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_user(data: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def _ensure_user(user_id: str):
    if user_id not in MOCK_CHAT_DB:
        MOCK_CHAT_DB[user_id] = {"conversations": {}}

def create_conversation(user_id: str, title: Optional[str] = None) -> str:
    _ensure_user(user_id)
    conv_id = str(uuid.uuid4())
    MOCK_CHAT_DB[user_id]["conversations"][conv_id] = {
        "id": conv_id,
        "user_id": user_id,
        "messages": [],
        "start_time": datetime.datetime.utcnow(),
        "last_active": datetime.datetime.utcnow(),
        "title": title or ""
    }
    return conv_id

def load_chat_history(user_id: str, conversation_id: str) -> List[dict]:
    conv = MOCK_CHAT_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
    if not conv:
        return []
    return list(conv.get("messages", []))

def save_chat_history(user_id: str, conversation_id: str, new_messages: List[dict], title: Optional[str] = None):
    _ensure_user(user_id)
    convs = MOCK_CHAT_DB[user_id]["conversations"]
    conv = convs.get(conversation_id)
    if not conv:
        convs[conversation_id] = {
            "id": conversation_id,
            "user_id": user_id,
            "messages": [],
            "start_time": datetime.datetime.utcnow(),
            "last_active": datetime.datetime.utcnow(),
            "title": title or ""
        }
        conv = convs[conversation_id]
    ts = datetime.datetime.utcnow().isoformat()
    conv["messages"].extend([{**m, "timestamp": m.get("timestamp") or ts} for m in new_messages])
    conv["last_active"] = datetime.datetime.utcnow()
    if title is not None and not conv.get("title"):
        conv["title"] = title

def _ensure_social_user(user_id: str):
    if user_id not in MOCK_SOCIAL_DB:
        MOCK_SOCIAL_DB[user_id] = {"conversations": {}}

def create_social_conversation(user_id: str, title: Optional[str] = None) -> str:
    _ensure_social_user(user_id)
    conv_id = str(uuid.uuid4())
    MOCK_SOCIAL_DB[user_id]["conversations"][conv_id] = {
        "id": conv_id,
        "user_id": user_id,
        "messages": [],
        "start_time": datetime.datetime.utcnow(),
        "last_active": datetime.datetime.utcnow(),
        "title": title or ""
    }
    return conv_id

def load_social_history(user_id: str, conversation_id: str) -> List[dict]:
    conv = MOCK_SOCIAL_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
    if not conv:
        return []
    return list(conv.get("messages", []))

def save_social_history(user_id: str, conversation_id: str, new_messages: List[dict], title: Optional[str] = None):
    _ensure_social_user(user_id)
    convs = MOCK_SOCIAL_DB[user_id]["conversations"]
    conv = convs.get(conversation_id)
    if not conv:
        convs[conversation_id] = {
            "id": conversation_id,
            "user_id": user_id,
            "messages": [],
            "start_time": datetime.datetime.utcnow(),
            "last_active": datetime.datetime.utcnow(),
            "title": title or ""
        }
        conv = convs[conversation_id]
    ts = datetime.datetime.utcnow().isoformat()
    conv["messages"].extend([{**m, "timestamp": m.get("timestamp") or ts} for m in new_messages])
    conv["last_active"] = datetime.datetime.utcnow()
    if title is not None and not conv.get("title"):
        conv["title"] = title

def get_current_user(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth:
        return "anonymous"
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        if token.startswith("mock-"):
            return token.replace("mock-", "").strip() or "anonymous"
        if jwt is not None:
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
                uid = str(payload.get("sub") or payload.get("user_id") or "").strip()
                return uid or "anonymous"
            except Exception:
                return "anonymous"
    return "anonymous"

def paginate_items(items: List[dict], page: int, page_size: int) -> dict:
    total = len(items)
    start = max((page - 1) * page_size, 0)
    end = min(start + page_size, total)
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": items[start:end]
    }

def generate_auto_title(user_text: str, ai_text: str) -> str:
    base = user_text.strip() or ai_text.strip() or "Hội thoại mới"
    base_words = base.split()
    simple = " ".join(base_words[:8])
    def _sanitize(s: str) -> str:
        import re
        s = s.strip()
        s = re.sub(r'[\r\n]+', ' ', s)
        s = re.sub(r'[*_`#]+', '', s)
        s = re.sub(r'\s+', ' ', s)
        s = s[:60]
        return s
    def _normalize(s: str) -> str:
        import re
        t = _sanitize(s)
        lower = t.lower()
        m = re.search(r'(\d{1,3})', lower)
        if ('lo âu' in lower) and m and ('liệu pháp' in lower or 'phương pháp' in lower or 'cách' in lower):
            n = m.group(1)
            return f"Giảm lo âu: {n} phương pháp hiệu quả"
        if ('lo âu' in lower) and ('liệu pháp' in lower or 'phương pháp' in lower or 'cách' in lower):
            return "Giảm lo âu: Phương pháp hiệu quả"
        toks = t.split()
        seen = set()
        dedup = []
        for tok in toks:
            k = tok.lower()
            if k not in seen:
                seen.add(k)
                dedup.append(tok)
        out = " ".join(dedup).strip()
        out = out[:60]
        return out or "Hội thoại"
    if (llm_pro or llm_flash) is None:
        return _normalize(simple)
    try:
        llm = llm_flash or llm_pro
        result = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": "Tạo tiêu đề ngắn gọn (≤6 từ) bằng tiếng Việt, mô tả chủ đề cuộc trò chuyện."},
                {"role": "user", "content": f"Người dùng: {user_text}\nTrợ lý: {ai_text}"}
            ],
            temperature=0.2,
            max_tokens=24,
        )
        raw = result.get("choices", [{}])[0].get("message", {}).get("content", simple)
        return _normalize(raw)
    except Exception:
        return _normalize(simple)

async def load_model():
    print(f"Checking PRO model: {PRO_MODEL_PATH}")
    print(f"PRO exists: {os.path.exists(PRO_MODEL_PATH)}")
    print(f"Checking FLASH model: {FLASH_MODEL_PATH}")
    print(f"FLASH exists: {os.path.exists(FLASH_MODEL_PATH)}")
    print(f"Llama available: {Llama is not None}")
    print("ℹ️ CPU text models will be lazy-loaded on demand when GPU is unavailable or switched to CPU.")
    print(f"Checking VLM model path: {VLM_MODEL_PATH}")
    print(f"VLM model file exists: {os.path.exists(VLM_MODEL_PATH)}")
    print(f"VLM CLIP model file exists: {os.path.exists(VLM_CLIP_MODEL_PATH)}")
    print("ℹ️ VLM model will be lazy-loaded on demand with GPU-first processing.")

def _append_runtime_event(event: dict):
    try:
        _ensure_runtime_files()
        pdir = _front_data_dir()
        events_path = os.path.join(pdir, "runtime-events.jsonl")
        with open(events_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
    except Exception:
        pass

def ensure_text_model(tier: str) -> bool:
    global llm_pro, llm_flash
    just_loaded = False
    if tier == "pro":
        if llm_pro is None and os.path.exists(PRO_MODEL_PATH) and Llama is not None:
            try:
                now = datetime.datetime.utcnow().isoformat()
                _append_runtime_event({"type": "cpu_model_loading", "tier": "pro", "ts": now})
                llm_pro = Llama(model_path=PRO_MODEL_PATH, n_ctx=2048, n_threads=4, verbose=False)
                just_loaded = True
                _append_runtime_event({"type": "cpu_model_loaded", "tier": "pro", "ts": datetime.datetime.utcnow().isoformat()})
            except Exception as e:
                llm_pro = None
                _append_runtime_event({"type": "cpu_model_load_failed", "tier": "pro", "error": str(e), "ts": datetime.datetime.utcnow().isoformat()})
    else:
        if llm_flash is None and os.path.exists(FLASH_MODEL_PATH) and Llama is not None:
            try:
                now = datetime.datetime.utcnow().isoformat()
                _append_runtime_event({"type": "cpu_model_loading", "tier": "flash", "ts": now})
                llm_flash = Llama(model_path=FLASH_MODEL_PATH, n_ctx=2048, n_threads=4, verbose=False)
                just_loaded = True
                _append_runtime_event({"type": "cpu_model_loaded", "tier": "flash", "ts": datetime.datetime.utcnow().isoformat()})
            except Exception as e:
                llm_flash = None
                _append_runtime_event({"type": "cpu_model_load_failed", "tier": "flash", "error": str(e), "ts": datetime.datetime.utcnow().isoformat()})
    return just_loaded

def ensure_vlm_model() -> bool:
    global vlm_llm
    if vlm_llm is not None:
        return False
    if not (os.path.exists(VLM_MODEL_PATH) and os.path.exists(VLM_CLIP_MODEL_PATH)):
        return False
    if Llama is None or Llava15ChatHandler is None:
        return False
    try:
        now = datetime.datetime.utcnow().isoformat()
        _append_runtime_event({"type": "cpu_model_loading", "tier": "vlm", "ts": now})
        chat_handler = Llava15ChatHandler(clip_model_path=VLM_CLIP_MODEL_PATH)
        vlm_llm = Llama(model_path=VLM_MODEL_PATH, chat_handler=chat_handler, n_ctx=2048, n_threads=4, verbose=False)
        _append_runtime_event({"type": "cpu_model_loaded", "tier": "vlm", "ts": datetime.datetime.utcnow().isoformat()})
        return True
    except Exception as e:
        vlm_llm = None
        _append_runtime_event({"type": "cpu_model_load_failed", "tier": "vlm", "error": str(e), "ts": datetime.datetime.utcnow().isoformat()})
        return False

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "text_model_loaded": (llm_pro is not None) or (llm_flash is not None), 
        "pro_loaded": llm_pro is not None,
        "flash_loaded": llm_flash is not None,
        "vlm_model_loaded": vlm_llm is not None,
        "proxy_target": LLAMA_SERVER_URL
    }

@app.get("/v1/models")
async def list_models():
    items = []
    if os.path.exists(PRO_MODEL_PATH):
        items.append({"id": os.path.basename(PRO_MODEL_PATH), "type": "gguf", "tier": "pro"})
    if os.path.exists(FLASH_MODEL_PATH):
        items.append({"id": os.path.basename(FLASH_MODEL_PATH), "type": "gguf", "tier": "flash"})
    if os.path.exists(VLM_MODEL_PATH):
        items.append({"id": os.path.basename(VLM_MODEL_PATH), "type": "gguf", "tier": "vlm"})
    return {"data": items}

def _front_data_dir():
    return os.path.join(REPO_ROOT, "medical-consultation-app", "data")

def _ensure_runtime_files():
    pdir = _front_data_dir()
    try:
        os.makedirs(pdir, exist_ok=True)
        mode_path = os.path.join(pdir, "runtime-mode.json")
        events_path = os.path.join(pdir, "runtime-events.jsonl")
        if not os.path.exists(mode_path):
            with open(mode_path, "w", encoding="utf-8") as f:
                json.dump({"target": "cpu", "updated_at": datetime.datetime.utcnow().isoformat()}, f, ensure_ascii=False)
        if not os.path.exists(events_path):
            with open(events_path, "w", encoding="utf-8") as f:
                f.write("")
    except Exception:
        pass

STATE_FILE = os.path.join(DATA_DIR, "runtime_state.json")

def _ensure_state_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(STATE_FILE):
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({"global": {"target": "cpu", "model": "flash", "updated_at": datetime.datetime.utcnow().isoformat()}, "users": {}}, f, ensure_ascii=False)

@app.get("/v1/runtime/mode")
async def get_runtime_mode():
    try:
        _ensure_runtime_files()
        pdir = _front_data_dir()
        mode_path = os.path.join(pdir, "runtime-mode.json")
        with open(mode_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": str(e)}

@app.post("/v1/runtime/mode")
async def set_runtime_mode(req: Request):
    try:
        _ensure_runtime_files()
        body = await req.json()
        target = "gpu" if str(body.get("target", "")).lower() == "gpu" else "cpu"
        gpu_url = body.get("gpu_url") if target == "gpu" else None
        now = datetime.datetime.utcnow().isoformat()
        payload = {"target": target, "updated_at": now}
        if gpu_url:
            payload["gpu_url"] = str(gpu_url)
        pdir = _front_data_dir()
        mode_path = os.path.join(pdir, "runtime-mode.json")
        events_path = os.path.join(pdir, "runtime-events.jsonl")
        with open(mode_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        with open(events_path, "a", encoding="utf-8") as f:
            f.write(json.dumps({"type": "mode_change", "target": target, "gpu_url": gpu_url, "ts": now}) + "\n")
        return {"ok": True, "mode": payload}
    except Exception as e:
        return {"error": str(e)}

@app.get("/v1/runtime/state")
async def get_runtime_state(request: Request):
    try:
        _ensure_state_file()
        user_id = get_current_user(request)
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if user_id and user_id != "anonymous":
            u = (data.get("users") or {}).get(user_id)
            if u:
                return u
        g = data.get("global") or {}
        return g
    except Exception as e:
        return {"error": str(e)}

@app.post("/v1/runtime/state")
async def set_runtime_state(req: Request):
    try:
        _ensure_state_file()
        body = await req.json()
        now = datetime.datetime.utcnow().isoformat()
        target = body.get("target")
        gpu_url = body.get("gpu_url")
        model = body.get("model")
        user_id = get_current_user(req)
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "users" not in data or not isinstance(data["users"], dict):
            data["users"] = {}
        cur = data.get("global") or {}
        if target in ("cpu", "gpu"):
            cur["target"] = target
            if target == "gpu" and gpu_url:
                cur["gpu_url"] = str(gpu_url)
            if target == "cpu":
                cur.pop("gpu_url", None)
        if model in ("flash", "pro"):
            cur["model"] = model
        cur["updated_at"] = now
        data["global"] = cur
        if user_id and user_id != "anonymous":
            u = data["users"].get(user_id) or {}
            if target in ("cpu", "gpu"):
                u["target"] = target
                if target == "gpu" and gpu_url:
                    u["gpu_url"] = str(gpu_url)
                if target == "cpu":
                    u.pop("gpu_url", None)
            if model in ("flash", "pro"):
                u["model"] = model
            u["updated_at"] = now
            data["users"][user_id] = u
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        try:
            _ensure_runtime_files()
            pdir = _front_data_dir()
            events_path = os.path.join(pdir, "runtime-events.jsonl")
            evt = {"ts": now}
            if target in ("cpu", "gpu"):
                evt.update({"type": "mode_change", "target": target, "gpu_url": gpu_url})
            if model in ("flash", "pro"):
                evt.update({"type": "model_change", "model": model})
            if "type" in evt:
                with open(events_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(evt) + "\n")
        except Exception:
            pass
        return {"ok": True, "state": cur}
    except Exception as e:
        return {"error": str(e)}
@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest, request: Request):
    selected = (req.model or "flash").lower()
    chosen_llm = None
    if selected == "pro":
        chosen_llm = llm_pro
    else:
        chosen_llm = llm_flash or llm_pro

    token_user = get_current_user(request)
    user_id = (token_user if token_user and token_user != "anonymous" else (req.user_id or "anonymous")).strip() or "anonymous"
    conversation_id = req.conversation_id or None
    if not conversation_id:
        conversation_id = create_conversation(user_id)

    history = load_chat_history(user_id, conversation_id)
    base_messages = [{"role": m.role, "content": m.content} for m in (req.messages or [])]
    if not base_messages:
        default_sys = """Bạn là Trợ lý Y tế AI. Nhiệm vụ của bạn là cung cấp thông tin y tế hữu ích, chính xác và an toàn bằng Tiếng Việt.
Lưu ý: Luôn khuyến cáo người dùng đi khám bác sĩ nếu có dấu hiệu nghiêm trọng. Không đưa ra chẩn đoán khẳng định thay thế bác sĩ."""
        sys_msg = (req.system or default_sys).strip()
        user_text = (req.prompt or req.question or req.message or "").strip()
        if sys_msg:
            base_messages = [{"role": "system", "content": sys_msg}, {"role": "user", "content": user_text}]
        else:
            base_messages = [{"role": "user", "content": user_text}]
    full_messages = history + base_messages

    try:
        _log_user = ""
        for _m in reversed(base_messages):
            if _m.get("role") == "user":
                _log_user = _m.get("content", "")
                break
        if _log_user:
            print(f"[USER] { _log_user }")
    except Exception:
        pass
    provider = (req.provider or os.environ.get("LLM_PROVIDER", "") or "").strip().lower()
    if provider == "gemini":
        content = _gemini_generate_text(full_messages, selected, req.temperature or 0.7, req.max_tokens or 512)
        last_user = None
        for m in reversed(base_messages):
            if m.get("role") == "user":
                last_user = {"role": "user", "content": m.get("content", "")}
                break
        to_save = []
        if last_user:
            to_save.append(last_user)
        to_save.append({"role": "assistant", "content": content})
        save_chat_history(user_id, conversation_id, to_save)
        conv = MOCK_CHAT_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
        if conv and not conv.get("title"):
            title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
            conv["title"] = title
        response = ChatResponse(
            id="gemini",
            choices=[ChatChoice(index=0, message=ChatMessage(role="assistant", content=content))],
            conversation_id=conversation_id,
        )
        data = response.dict()
        data["mode_used"] = "gpu"
        data["provider"] = "gemini"
        return data
    target = _current_target()
    if target == "gpu":
        try:
            payload = req.dict()
            payload["messages"] = full_messages
            base = _get_proxy_base()
            headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
            auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
            if auth:
                headers["Authorization"] = auth
            mode_sel = "pro" if (req.model or "").lower() == "pro" else "flash"
            headers["X-Mode"] = mode_sel
            payload["mode"] = mode_sel
            proxied = requests.post(
                f"{base.rstrip('/')}/v1/chat/completions",
                headers=headers,
                data=json.dumps(payload),
                timeout=60,
            )
            if not proxied.ok:
                fallback = requests.post(
                    f"{base.rstrip('/')}/v1/chat",
                    headers=headers,
                    data=json.dumps({"messages": payload["messages"], "mode": mode_sel}),
                    timeout=60,
                )
                if fallback.ok:
                    proxied_data = fallback.json()
                else:
                    alt = requests.post(
                        f"{base.rstrip('/')}/v1/chat/completions",
                        headers=headers,
                        data=json.dumps(payload),
                        timeout=60,
                    )
                    if alt.ok:
                        proxied_data = alt.json()
                    else:
                        proxied.raise_for_status()
                        proxied_data = proxied.json()
            else:
                proxied_data = proxied.json()
            content = ""
            if "choices" in proxied_data:
                content = proxied_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                content = str(proxied_data.get("reply", "")) or f"Xin lỗi, tôi đang gặp sự cố kỹ thuật: {proxied_data.get('error', 'Unknown error')}"
            last_user = None
            for m in reversed(base_messages):
                if m["role"] == "user":
                    last_user = {"role": "user", "content": m["content"]}
                    break
            to_save = []
            if last_user:
                to_save.append(last_user)
            to_save.append({"role": "assistant", "content": content})
            save_chat_history(user_id, conversation_id, to_save)
            conv = MOCK_CHAT_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
            if conv and not conv.get("title"):
                title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
                conv["title"] = title
            response = ChatResponse(
                id=str(proxied_data.get("id", "proxy")),
                choices=[ChatChoice(index=0, message=ChatMessage(role="assistant", content=content))],
                conversation_id=conversation_id,
            )
            data = response.dict()
            data["mode_used"] = "gpu"
            try:
                data["mode_tier"] = headers.get("X-Mode", "").lower() or (str(req.model or "").lower() or "flash")
            except Exception:
                data["mode_tier"] = str(req.model or "").lower() or "flash"
            if isinstance(proxied_data, dict) and "rag" in proxied_data:
                data["rag"] = proxied_data.get("rag")
            return data
        except Exception:
            pass

    just_loaded = False
    if chosen_llm is None:
        just_loaded = ensure_text_model(selected)
        if selected == "pro":
            chosen_llm = llm_pro
        else:
            chosen_llm = llm_flash or llm_pro

    if chosen_llm is not None:
        result = chosen_llm.create_chat_completion(
            messages=full_messages,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        last_user = None
        for m in reversed(base_messages):
            if m.get("role") == "user":
                last_user = {"role": "user", "content": m.get("content", "")}
                break
        to_save = []
        if last_user:
            to_save.append(last_user)
        to_save.append({"role": "assistant", "content": content})
        save_chat_history(user_id, conversation_id, to_save)
        conv = MOCK_CHAT_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
        if conv and not conv.get("title"):
            title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
            conv["title"] = title
        response = ChatResponse(
            id=str(result.get("id", "local-llama")),
            choices=[ChatChoice(index=0, message=ChatMessage(role="assistant", content=content))],
            conversation_id=conversation_id,
        )
        data = response.dict()
        data["mode_used"] = "cpu"
        if just_loaded:
            data["model_init"] = True
        return data
    error_message = f"Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau."
    return ChatResponse(
        id="error",
        choices=[ChatChoice(index=0, message=ChatMessage(role="assistant", content=error_message))],
        conversation_id=conversation_id,
    )

@app.post("/v1/friend-chat/completions")
async def friend_chat_completions(req: ChatRequest, request: Request):
    selected = (req.model or "flash").lower()
    chosen_llm = None
    if selected == "pro":
        chosen_llm = llm_pro
    else:
        chosen_llm = llm_flash or llm_pro
    token_user = get_current_user(request)
    user_id = (token_user if token_user and token_user != "anonymous" else (req.user_id or "anonymous")).strip() or "anonymous"
    conversation_id = req.conversation_id or None
    if not conversation_id:
        conversation_id = create_social_conversation(user_id)
    history = load_social_history(user_id, conversation_id)
    friend_prompt = (
        "Bạn là một người bạn thân, nói chuyện đời thường bằng tiếng Việt.\n"
        "Cách nói tự nhiên, gần gũi, có thể hài hước nhẹ, dùng từ ngữ bình dân.\n\n"
        "Nguyên tắc:\n"
        "- Ưu tiên lắng nghe và đồng cảm trước.\n"
        "- Không giảng đạo lý, không nói như sách vở.\n"
        "- Không khuyên dạy ngay, trừ khi người dùng hỏi rõ.\n"
        "- Phản hồi giống người thật đang trò chuyện, không phải trợ lý máy móc.\n"
        "- Có thể hỏi lại 1 câu ngắn để hiểu thêm cảm xúc người nói.\n\n"
        "Tránh:\n"
        "- Nói quá dài.\n"
        "- Dùng từ ngữ học thuật.\n"
        "- Kết luận thay người dùng.\n"
    )
    base_messages = [{"role": m.role, "content": m.content} for m in (req.messages or [])]
    if not base_messages:
        user_text = (req.prompt or req.question or req.message or "").strip()
        base_messages = [{"role": "system", "content": friend_prompt}, {"role": "user", "content": user_text}]
    else:
        base_messages = [{"role": "system", "content": friend_prompt}] + base_messages
    full_messages = history + base_messages
    provider = (req.provider or os.environ.get("LLM_PROVIDER", "") or "").strip().lower()
    if provider == "gemini":
        content = _gemini_generate_text(full_messages, selected, req.temperature or 0.7, req.max_tokens or 512)
        last_user = None
        for m in reversed(base_messages):
            if m.get("role") == "user":
                last_user = {"role": "user", "content": m.get("content", "")}
                break
        to_save = []
        if last_user:
            to_save.append(last_user)
        to_save.append({"role": "assistant", "content": content})
        save_social_history(user_id, conversation_id, to_save)
        conv = MOCK_SOCIAL_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
        if conv and not conv.get("title"):
            title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
            conv["title"] = title
        return {
            "id": "gemini",
            "object": "chat.completion",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "conversation_id": conversation_id,
            "mode_used": "gpu",
            "provider": "gemini"
        }
    target = _current_target()
    if target == "gpu":
        try:
            payload = req.dict()
            payload["messages"] = full_messages
            base = _get_proxy_base()
            headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
            auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
            if auth:
                headers["Authorization"] = auth
            mode_sel = "pro" if (req.model or "").lower() == "pro" else "flash"
            headers["X-Mode"] = mode_sel
            payload["mode"] = mode_sel
            proxied = requests.post(
                f"{base.rstrip('/')}/v1/friend-chat/completions",
                headers=headers,
                data=json.dumps(payload),
                timeout=60,
            )
            if not proxied.ok:
                fallback = requests.post(
                    f"{base.rstrip('/')}/v1/chat/completions",
                    headers=headers,
                    data=json.dumps({"messages": payload["messages"], "mode": mode_sel}),
                    timeout=60,
                )
                if fallback.ok:
                    proxied_data = fallback.json()
                else:
                    proxied.raise_for_status()
                    proxied_data = proxied.json()
            else:
                proxied_data = proxied.json()
            content = ""
            if "choices" in proxied_data:
                content = proxied_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                content = str(proxied_data.get("reply", "")) or f"Xin lỗi, tôi đang gặp sự cố kỹ thuật: {proxied_data.get('error', 'Unknown error')}"
            last_user = None
            for m in reversed(base_messages):
                if m["role"] == "user":
                    last_user = {"role": "user", "content": m["content"]}
                    break
            to_save = []
            if last_user:
                to_save.append(last_user)
            to_save.append({"role": "assistant", "content": content})
            save_social_history(user_id, conversation_id, to_save)
            conv = MOCK_SOCIAL_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
            if conv and not conv.get("title"):
                title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
                conv["title"] = title
            return {
                "id": str(proxied_data.get("id", "proxy")),
                "object": "chat.completion",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                "conversation_id": conversation_id,
                "mode_used": "gpu"
            }
        except Exception:
            pass
    just_loaded = False
    if chosen_llm is None:
        just_loaded = ensure_text_model(selected)
        if selected == "pro":
            chosen_llm = llm_pro
        else:
            chosen_llm = llm_flash or llm_pro
    if chosen_llm is not None:
        result = chosen_llm.create_chat_completion(
            messages=full_messages,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        last_user = None
        for m in reversed(base_messages):
            if m.get("role") == "user":
                last_user = {"role": "user", "content": m.get("content", "")}
                break
        to_save = []
        if last_user:
            to_save.append(last_user)
        to_save.append({"role": "assistant", "content": content})
        save_social_history(user_id, conversation_id, to_save)
        conv = MOCK_SOCIAL_DB.get(user_id, {}).get("conversations", {}).get(conversation_id)
        if conv and not conv.get("title"):
            title = generate_auto_title(last_user.get("content", "") if last_user else "", content)
            conv["title"] = title
        return {
            "id": str(result.get("id", "local-llama")),
            "object": "chat.completion",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "conversation_id": conversation_id,
            "mode_used": "cpu",
            **({"model_init": True} if just_loaded else {})
        }

@app.post("/v1/vision-multi")
async def vision_multi(req: VisionMultiRequest):
    base = _choose_gpu_url(round_robin=True)
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
    auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
    if auth:
        headers["Authorization"] = auth
    r = requests.post(f"{base.rstrip('/')}/v1/vision-multi", headers=headers, data=json.dumps(req.dict()), timeout=60)
    r.raise_for_status()
    data = r.json()
    try:
        gm = requests.get(f"{base.rstrip('/')}/gpu/metrics", headers={"ngrok-skip-browser-warning": "true"}, timeout=5)
        if gm.ok:
            v = gm.json()
            pdir = _front_data_dir()
            with open(os.path.join(pdir, "runtime-events.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({"type": "gpu_metrics", "endpoint": "vision-multi", "data": v, "ts": datetime.datetime.utcnow().isoformat()}) + "\n")
    except Exception:
        pass
    return data

@app.post("/v1/tts/stream")
async def tts_stream(req: TextToSpeechStreamRequest):
    base = _choose_gpu_url(round_robin=True)
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
    auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
    if auth:
        headers["Authorization"] = auth
    def gen():
        with requests.post(f"{base.rstrip('/')}/v1/tts/stream", headers=headers, data=json.dumps(req.dict()), timeout=120, stream=True) as resp:
            for chunk in resp.iter_content(chunk_size=1024):
                if chunk:
                    yield chunk
    return StreamingResponse(gen(), media_type="audio/mpeg")

@app.post("/v1/stt/stream")
async def stt_stream(file: UploadFile = File(...)):
    base = _choose_gpu_url(round_robin=True)
    headers = {"ngrok-skip-browser-warning": "true"}
    auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
    if auth:
        headers["Authorization"] = auth
    content = await file.read()
    def gen():
        with requests.post(f"{base.rstrip('/')}/v1/stt/stream", headers=headers, files={"file": (file.filename or "audio.wav", content, "audio/wav")}, timeout=120, stream=True) as resp:
            for line in resp.iter_lines():
                if not line:
                    continue
                yield line + b"\n"
    return StreamingResponse(gen(), media_type="application/json")

@app.get("/gpu/metrics")
async def gpu_metrics():
    base = _get_proxy_base()
    headers = {"ngrok-skip-browser-warning": "true"}
    auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
    if auth:
        headers["Authorization"] = auth
    try:
        r = requests.get(f"{base.rstrip('/')}/gpu/metrics", headers=headers, timeout=10)
        if r.ok:
            return r.json()
    except Exception:
        pass
    data = {}
    try:
        q = [
            "nvidia-smi",
            "--query-gpu=temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used",
            "--format=csv,noheader,nounits",
        ]
        proc = subprocess.run(q, capture_output=True, text=True)
        if proc.returncode == 0:
            s = proc.stdout.strip().split(",")
            data["gpu_temperature"] = float(s[0])
            data["gpu_utilization"] = float(s[1])
            data["mem_utilization"] = float(s[2])
            data["mem_total"] = float(s[3])
            data["mem_used"] = float(s[4])
    except Exception:
        pass
    return data

@app.post("/v1/health-lookup")
async def health_lookup(req: HealthLookupRequest):
    """
    Tra cứu y khoa (bệnh/thuốc/triệu chứng) ưu tiên từ file JSON nội bộ.

    - Nếu không tìm thấy trong JSON, fallback sang RAG với system prompt.
    - Đảm bảo định dạng trả lời chuẩn và nhắc nhở an toàn.
    """
    global rag_chat
    try:
        target = _current_target()
    except Exception:
        target = "gpu"
    # Heuristic classification for medical relevance and category
    def _classify_query(q: str):
        t = (q or "").strip().lower()
        drug_hints = ['thuốc', 'viên', 'mg', 'mcg', 'ml', '%', 'dạng', 'sirô', 'siro', 'kem', 'mỡ', 'ống', 'chai', 'hàm lượng', 'liều']
        disease_hints = ['bệnh', 'hội chứng', 'viêm', 'ung thư', 'tiểu đường', 'cao huyết áp', 'tim mạch', 'hen', 'suy', 'nhiễm', 'virus', 'vi khuẩn', 'vi rút']
        symptom_hints = ['triệu chứng', 'dấu hiệu', 'đau', 'nhức', 'sốt', 'ho', 'mệt', 'mệt mỏi', 'chóng mặt', 'buồn nôn', 'phát ban', 'khó thở', 'tiêu chảy', 'táo bón', 'đau đầu']
        medical_ctx_hints = ['chẩn đoán', 'điều trị', 'phòng ngừa', 'tác dụng phụ', 'dược', 'y khoa', 'bác sĩ', 'liều dùng']
        is_drug = any(k in t for k in drug_hints) or bool(__import__('re').search(r"\b\d+\s?(mg|ml|mcg|%)\b", t))
        is_symptom = any(k in t for k in symptom_hints)
        is_disease = any(k in t for k in disease_hints)
        looks_medical = is_drug or is_symptom or is_disease or any(k in t for k in medical_ctx_hints)
        if is_drug: return {"mode": "drug", "is_medical": True}
        if is_disease: return {"mode": "disease", "is_medical": True}
        if is_symptom: return {"mode": "symptom", "is_medical": True}
        return {"mode": None, "is_medical": looks_medical}

    def _llm_classify_query_local(q: str) -> str:
        try:
            model = llm_pro or llm_flash
            if model is None:
                return ""
            prompt = "Chỉ trả lời một từ: 'thuốc' hoặc 'bệnh' hoặc 'triệu chứng' hoặc 'không liên quan'. Truy vấn: " + (q or "").strip()
            try:
                res = model.create_chat_completion(messages=[{"role": "user", "content": prompt}], temperature=0, max_tokens=4)
                msg = str(res.get("choices", [{}])[0].get("message", {}).get("content", "")).strip().lower()
                return msg
            except Exception:
                out = model.create_completion(prompt=prompt, temperature=0, max_tokens=8)
                txt = str(out.get("choices", [{}])[0].get("text", "")).strip().lower()
                return txt
        except Exception:
            return ""

    cls = _classify_query(req.query)
    label = _llm_classify_query_local(req.query)
    if "thuốc" in label:
        cls = {"mode": "drug", "is_medical": True}
    elif "bệnh" in label:
        cls = {"mode": "disease", "is_medical": True}
    elif "triệu chứng" in label:
        cls = {"mode": "symptom", "is_medical": True}
    elif "không" in label:
        cls = {"mode": None, "is_medical": False}
    if not cls.get("is_medical"):
        msg = "Câu hỏi không liên quan đến y tế. Vui lòng truy cập trang tư vấn để đặt câu hỏi phù hợp."
        return HealthLookupResponse(success=True, response=msg, mode=target, redirect_url="/tu-van")

    inferred_mode = (req.mode or cls.get("mode") or "").lower()
    if target == "gpu":
        try:
            base = _get_proxy_base()
            headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
            auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
            if auth:
                headers["Authorization"] = auth
            body = req.dict()
            if not body.get("mode") and inferred_mode:
                body["mode"] = inferred_mode
            r = requests.post(f"{base.rstrip('/')}/v1/health-lookup", headers=headers, data=json.dumps(body), timeout=60)
            if r.ok:
                data = r.json()
                return HealthLookupResponse(
                    success=bool(data.get("success", True)),
                    response=data.get("response"),
                    error=data.get("error"),
                    conversation_id=data.get("conversation_id"),
                    mode=str(data.get("mode") or "gpu"),
                    redirect_url=data.get("redirect_url")
                )
        except Exception:
            pass

    # Đường dẫn tới file dữ liệu nội bộ
    data_path = os.path.join(os.path.dirname(__file__), "data", "data.json")
    drug_ext_path = os.path.join(os.path.dirname(__file__), "data", "thuoc.json")

    # Helper: chuẩn hóa chuỗi
    def norm(s: str) -> str:
        return (s or "").strip().lower()

    # Helper: dựng trả lời từ JSON cho bệnh
    def format_disease(d: dict) -> str:
        parts = []
        if d.get("definition"): parts.append(f"Định nghĩa: {d['definition']}")
        if d.get("causes"): parts.append(f"Nguyên nhân: {', '.join(d['causes']) if isinstance(d['causes'], list) else d['causes']}")
        if d.get("symptoms"): parts.append(f"Triệu chứng: {', '.join(d['symptoms']) if isinstance(d['symptoms'], list) else d['symptoms']}")
        if d.get("diagnosis"): parts.append(f"Chẩn đoán: {d['diagnosis']}")
        if d.get("treatment"): parts.append(f"Điều trị: {d['treatment']}")
        if d.get("warnings"): parts.append(f"Lưu ý: {d['warnings']}")
        return "\n".join(parts)

    # Helper: dựng trả lời từ JSON cho thuốc
    def format_drug(dr: dict) -> str:
        parts = []
        if dr.get("uses"): parts.append(f"Công dụng: {dr['uses']}")
        if dr.get("dosage"): parts.append(f"Liều dùng: {dr['dosage']}")
        if dr.get("side_effects"): parts.append(f"Tác dụng phụ: {', '.join(dr['side_effects']) if isinstance(dr['side_effects'], list) else dr['side_effects']}")
        if dr.get("interactions"): parts.append(f"Tương tác: {', '.join(dr['interactions']) if isinstance(dr['interactions'], list) else dr['interactions']}")
        if dr.get("contraindications"): parts.append(f"Chống chỉ định: {', '.join(dr['contraindications']) if isinstance(dr['contraindications'], list) else dr['contraindications']}")
        if dr.get("notes"): parts.append(f"Ghi chú: {dr['notes']}")
        return "\n".join(parts)

    # 1) Tra cứu từ JSON nội bộ
    try:
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Không tìm thấy dữ liệu nội bộ: {data_path}")
        with open(data_path, "r", encoding="utf-8") as f:
            db = json.load(f)
        ext_drugs: List[dict] = []
        if os.path.exists(drug_ext_path):
            try:
                with open(drug_ext_path, "r", encoding="utf-8") as df:
                    j = json.load(df)
                    if isinstance(j, list):
                        ext_drugs = j
            except Exception:
                ext_drugs = []

        query = norm(req.query)
        mode = inferred_mode

        disease_match = None
        drug_match = None

        if isinstance(db.get("diseases"), list):
            for d in db["diseases"]:
                name = norm(d.get("name", ""))
                if name == query or (query and query in name):
                    disease_match = d
                    break

        if isinstance(db.get("drugs"), list):
            for dr in db["drugs"]:
                name = norm(dr.get("name", ""))
                if name == query or (query and query in name):
                    drug_match = dr
                    break
        if not drug_match and isinstance(ext_drugs, list):
            for dr in ext_drugs:
                name = norm(dr.get("name", ""))
                if name == query or (query and query in name):
                    drug_match = {"name": dr.get("name", ""), "uses": "", "dosage": "", "side_effects": [], "interactions": [], "contraindications": [], "notes": dr.get("content", "")}
                    break

        # Ưu tiên theo mode nếu có
        if mode == "drug" and drug_match:
            text = f"Thuốc: {drug_match.get('name','')}\n" + (format_drug(drug_match) if drug_match.get("uses") or drug_match.get("dosage") else (drug_match.get("notes") or ""))
            return HealthLookupResponse(success=True, response=text, mode=target)
        if mode == "disease" and disease_match:
            text = f"Bệnh: {disease_match.get('name','')}\n" + format_disease(disease_match)
            return HealthLookupResponse(success=True, response=text, mode=target)

        # Không có mode: trả cái nào khớp trước
        if disease_match:
            text = f"Bệnh: {disease_match.get('name','')}\n" + format_disease(disease_match)
            user_id = (req.user_id or "anonymous").strip() or "anonymous"
            conversation_id = req.conversation_id or create_conversation(user_id)
            save_chat_history(user_id, conversation_id, [
                {"role": "user", "content": req.query.strip()},
                {"role": "assistant", "content": text}
            ])
            return HealthLookupResponse(success=True, response=text, conversation_id=conversation_id, mode=target)
        if drug_match:
            text = f"Thuốc: {drug_match.get('name','')}\n" + (format_drug(drug_match) if drug_match.get("uses") or drug_match.get("dosage") else (drug_match.get("notes") or ""))
            user_id = (req.user_id or "anonymous").strip() or "anonymous"
            conversation_id = req.conversation_id or create_conversation(user_id)
            save_chat_history(user_id, conversation_id, [
                {"role": "user", "content": req.query.strip()},
                {"role": "assistant", "content": text}
            ])
            return HealthLookupResponse(success=True, response=text, conversation_id=conversation_id, mode=target)
    except Exception as e:
        # Không chặn tiến trình; sẽ fallback RAG
        print(f"Health lookup JSON error: {str(e)}")

    # 2) Fallback RAG với System Prompt
    if rag_chat is None:
        try:
            from RAG.RAG_QA import LLM_CHAT
            rag_chat = LLM_CHAT()
        except Exception as e:
            try:
                import sys, subprocess
                subprocess.run([sys.executable, "-m", "pip", "install", "langchain-community", "chromadb", "llama-index", "llama-index-vector-stores-chroma", "llama-index-embeddings-langchain", "langchain-openai", "sentence-transformers"], check=True)
                from RAG.RAG_QA import LLM_CHAT
                rag_chat = LLM_CHAT()
            except Exception as e2:
                return HealthLookupResponse(success=False, error=f"Không thể khởi tạo RAG: {str(e2)}")

    safety_disclaimer = (
        "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn bác sĩ. "
        "Luôn cân nhắc cơ địa, bệnh nền, tương tác thuốc và chống chỉ định. "
        "Khuyến khích người dùng hỏi ý kiến chuyên gia y tế cho quyết định điều trị."
    )

    format_guide = (
        "\n\nĐỊNH DẠNG TRẢ LỜI:\n"
        "📋 Thông tin chính:\n- Định nghĩa/Mô tả\n- Nguyên nhân chính\n- Triệu chứng thường gặp\n"
        "\n🔍 Chi tiết:\n- Cách chẩn đoán\n- Phương pháp điều trị\n- Biến chứng có thể xảy ra\n"
        "\n⚠️ Lưu ý quan trọng:\n- Khi nào cần đến bác sĩ\n- Dấu hiệu cảnh báo\n"
    )

    medication_focus = "\nNếu là thuốc: thêm Liều dùng phổ biến, Tác dụng phụ, Tương tác, Chống chỉ định."

    mode_hint = ""
    if req.mode:
        if req.mode.lower() == "drug":
            mode_hint = "\nTrọng tâm: Thuốc." + medication_focus
        elif req.mode.lower() == "disease":
            mode_hint = "\nTrọng tâm: Bệnh lý."
        elif req.mode.lower() == "symptom":
            mode_hint = "\nTrọng tâm: Triệu chứng."

    system_prompt = (
        "Bạn là cơ sở dữ liệu y khoa an toàn và chính xác. "
        + safety_disclaimer
        + format_guide
        + mode_hint
    )
    user_query = req.query.strip()

    try:
        answer_text = rag_chat.answer_with_system_prompt(system_prompt, user_query)
        user_id = (req.user_id or "anonymous").strip() or "anonymous"
        conversation_id = req.conversation_id or create_conversation(user_id)
        save_chat_history(user_id, conversation_id, [
            {"role": "user", "content": user_query},
            {"role": "assistant", "content": answer_text}
        ])
        return HealthLookupResponse(success=True, response=answer_text, conversation_id=conversation_id, mode=target)
    except Exception as e:
        fallback_text = (
            "Hệ thống tra cứu đang gặp sự cố kết nối LLM. Dưới đây là hướng dẫn chung:\n"
            + safety_disclaimer
        )
        user_id = (req.user_id or "anonymous").strip() or "anonymous"
        conversation_id = req.conversation_id or create_conversation(user_id)
        save_chat_history(user_id, conversation_id, [
            {"role": "user", "content": user_query},
            {"role": "assistant", "content": fallback_text}
        ])
        return HealthLookupResponse(success=True, response=fallback_text, conversation_id=conversation_id, mode=target)

@app.get("/v1/benh")
async def list_benh(q: Optional[str] = None):
    try:
        p = os.path.join(os.path.dirname(__file__), "data", "benh.json")
        if not os.path.exists(p):
            return {"items": []}
        with open(p, "r", encoding="utf-8") as f:
            arr = json.load(f)
        if isinstance(arr, list):
            if q:
                t = str(q).strip().lower()
                arr = [x for x in arr if str(x.get("name", "")).strip().lower().find(t) >= 0]
            return {"items": arr}
        return {"items": []}
    except Exception as e:
        return {"error": str(e), "items": []}

@app.get("/v1/thuoc")
async def list_thuoc(q: Optional[str] = None):
    try:
        p = os.path.join(os.path.dirname(__file__), "data", "thuoc.json")
        if not os.path.exists(p):
            return {"items": []}
        with open(p, "r", encoding="utf-8") as f:
            arr = json.load(f)
        if isinstance(arr, list):
            if q:
                t = str(q).strip().lower()
                arr = [x for x in arr if str(x.get("name", "")).strip().lower().find(t) >= 0]
            return {"items": arr}
        return {"items": []}
    except Exception as e:
        return {"error": str(e), "items": []}

@app.post("/v1/text-to-speech")
async def text_to_speech(req: TextToSpeechRequest):
    if gTTS is None:
        raise HTTPException(status_code=500, detail="gTTS library not available")
    
    try:
        # Tạo đối tượng gTTS
        tts = gTTS(text=req.text, lang=req.lang)
        
        # Tạo tên file với timestamp
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        filename = f"tts_output_{timestamp}.mp3"
        
        # Tạo thư mục audio nếu chưa tồn tại
        audio_dir = os.path.join(os.path.dirname(__file__), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        # Đường dẫn file đầy đủ
        file_path = os.path.join(audio_dir, filename)
        
        # Lưu file audio
        tts.save(file_path)
        
        return {
            "success": True,
            "filename": filename,
            "file_path": file_path,
            "download_url": f"/v1/audio/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating audio: {str(e)}")

@app.post("/v1/text-to-speech-streaming")
async def text_to_speech_streaming(req: TextToSpeechRequest):
    """
    Enhanced text-to-speech with text chunking for faster response
    """
    if gTTS is None:
        raise HTTPException(status_code=500, detail="gTTS library not available")
    
    if TextChunker is None:
        print("WARNING: Text chunking utilities not available, falling back to regular processing")
        return await text_to_speech(req)
    
    try:
        # Chunk the text into smaller parts
        print(f"Chunking text for streaming TTS: {req.text[:100]}...")
        chunks = TextChunker.chunk_by_sentences(req.text, max_chunk_length=150)
        print(f"Text chunked into {len(chunks)} parts")
        
        if len(chunks) <= 1:
            # If only one chunk, use regular processing
            return await text_to_speech(req)
        
        # Create audio for each chunk
        audio_files = []
        combined_audio = None
        
        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
                
            print(f"Processing chunk {i+1}/{len(chunks)}: {chunk[:50]}...")
            
            # Create gTTS for this chunk
            tts = gTTS(text=chunk.strip(), lang=req.lang)
            
            # Create temporary file for this chunk
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_chunk_{i}.mp3") as temp_file:
                chunk_path = temp_file.name
                
            # Save chunk audio
            tts.save(chunk_path)
            audio_files.append(chunk_path)
            
            # Combine with previous audio using pydub
            if AudioSegment is not None:
                chunk_audio = AudioSegment.from_mp3(chunk_path)
                
                if combined_audio is None:
                    combined_audio = chunk_audio
                else:
                    # Add small pause between chunks
                    pause = AudioSegment.silent(duration=200)  # 200ms pause
                    combined_audio = combined_audio + pause + chunk_audio
        
        # Save combined audio
        now = datetime.datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        filename = f"tts_streaming_{timestamp}.mp3"
        
        # Create audio directory
        audio_dir = os.path.join(os.path.dirname(__file__), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        file_path = os.path.join(audio_dir, filename)
        
        if combined_audio is not None:
            # Export combined audio
            combined_audio.export(file_path, format="mp3")
            print(f"Streaming TTS completed: {filename}")
        else:
            # Fallback: just use the first chunk
            if audio_files:
                import shutil
                shutil.copy2(audio_files[0], file_path)
                print(f"Fallback TTS completed: {filename}")
            else:
                raise Exception("No audio chunks created")
        
        # Cleanup chunk files
        for chunk_file in audio_files:
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
            except Exception as e:
                print(f"Error cleaning up chunk file {chunk_file}: {e}")
        
        return {
            "success": True,
            "filename": filename,
            "file_path": file_path,
            "download_url": f"/v1/audio/{filename}",
            "chunks_processed": len(chunks),
            "streaming": True
        }

    except Exception as e:
        print(f"Error in streaming TTS: {e}")
        # Cleanup any created files
        for chunk_file in audio_files:
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error generating streaming audio: {str(e)}")

@app.get("/v1/text-to-speech-stream")
async def text_to_speech_stream(text: str, lang: str = "vi"):
    """
    Streaming TTS: chia nhỏ văn bản và phát MP3 theo luồng từng phần.
    - Trả về luồng `audio/mpeg` để trình duyệt có thể bắt đầu phát sớm
    - Nếu không có TextChunker, xử lý toàn bộ văn bản một lần rồi stream
    """
    if gTTS is None:
        try:
            base = _choose_gpu_url(round_robin=True)
            headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
            auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
            if auth:
                headers["Authorization"] = auth
            def gen():
                try:
                    import base64 as pybase64
                    with requests.post(f"{base.rstrip('/')}/v1/tts/stream", headers=headers, data=json.dumps({"text": text, "lang": lang}), timeout=300, stream=True) as resp:
                        for line in resp.iter_lines():
                            if not line:
                                continue
                            try:
                                obj = json.loads(line.decode("utf-8"))
                                b64 = obj.get("audio_base64")
                                if isinstance(b64, str) and b64:
                                    yield pybase64.b64decode(b64)
                            except Exception:
                                break
                except Exception:
                    return
            return StreamingResponse(gen(), media_type="audio/mpeg")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"gTTS not available and GPU fallback failed: {str(e)}")

    def stream_file_bytes(path: str, chunk_size: int = 64 * 1024):
        with open(path, "rb") as f:
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                yield data

    # Fallback không chunking: tạo một file rồi stream
    if TextChunker is None:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                tmp_path = temp_file.name
            tts = gTTS(text=text, lang=lang)
            tts.save(tmp_path)
            def stream_file_bytes_with_cleanup(path: str, chunk_size: int = 64 * 1024):
                try:
                    with open(path, "rb") as f:
                        while True:
                            data = f.read(chunk_size)
                            if not data:
                                break
                            yield data
                finally:
                    try:
                        if os.path.exists(path):
                            os.remove(path)
                    except Exception:
                        pass
            return StreamingResponse(stream_file_bytes_with_cleanup(tmp_path), media_type="audio/mpeg")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating audio: {str(e)}")

    # Có TextChunker: stream từng chunk ngay khi sẵn sàng
    try:
        chunks = TextChunker.chunk_by_sentences(text, max_chunk_length=150)

        async def audio_generator():
            for i, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue
                # Tạo mp3 cho từng chunk
                with tempfile.NamedTemporaryFile(delete=False, suffix=f"_chunk_{i}.mp3") as temp_file:
                    chunk_path = temp_file.name
                try:
                    tts = gTTS(text=chunk.strip(), lang=lang)
                    tts.save(chunk_path)

                    # Stream bytes của chunk này
                    for piece in stream_file_bytes(chunk_path):
                        yield piece
                except Exception as e:
                    # Bỏ qua chunk lỗi và tiếp tục
                    print(f"Error generating chunk {i}: {e}")
                    continue
                finally:
                    try:
                        if os.path.exists(chunk_path):
                            os.remove(chunk_path)
                    except Exception:
                        pass

        return StreamingResponse(audio_generator(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating streaming audio: {str(e)}")

@app.get("/v1/audio/{filename}")
async def get_audio_file(filename: str):
    audio_dir = os.path.join(os.path.dirname(__file__), "audio")
    file_path = os.path.join(audio_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=filename
    )

@app.post("/v1/speech-to-text")
async def speech_to_text(audio_file: UploadFile = File(...)):
    print(f"Speech-to-text request received. File: {audio_file.filename}, Content-Type: {audio_file.content_type}")
    
    if sr is None:
        print("ERROR: speech_recognition library not available")
        raise HTTPException(status_code=500, detail="speech_recognition library not available")
    
    temp_file_path = None
    wav_file_path = None
    
    try:
        print(f"Received audio file: {audio_file.filename}, content_type: {audio_file.content_type}")
        
        # Đọc nội dung file
        content = await audio_file.read()
        print(f"Audio file size: {len(content)} bytes")
        
        # Xác định extension dựa trên content type
        file_extension = ".webm"
        if audio_file.content_type:
            if "webm" in audio_file.content_type:
                file_extension = ".webm"
            elif "ogg" in audio_file.content_type:
                file_extension = ".ogg"
            elif "mp4" in audio_file.content_type or "m4a" in audio_file.content_type:
                file_extension = ".m4a"
            elif "wav" in audio_file.content_type:
                file_extension = ".wav"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
            print(f"Temporary file created: {temp_file_path}")
        
        # Convert to WAV if not already WAV
        if file_extension != ".wav":
            if AudioSegment is None:
                print("WARNING: pydub not available, cannot convert audio format")
                audio_file_to_process = temp_file_path
            else:
                print(f"Converting {file_extension} to WAV using pydub...")
                try:
                    # Load audio file with pydub
                    print(f"Loading audio file: {temp_file_path}")
                    audio = AudioSegment.from_file(temp_file_path)
                    print(f"Audio loaded successfully. Duration: {len(audio)}ms, Channels: {audio.channels}, Frame rate: {audio.frame_rate}")
                    audio = audio.set_frame_rate(16000).set_channels(1)
                    
                    # Create WAV file
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav_file:
                        wav_file_path = wav_file.name
                    
                    # Export as WAV
                    print(f"Exporting to WAV: {wav_file_path}")
                    audio.export(wav_file_path, format="wav")
                    print(f"Audio converted to WAV successfully: {wav_file_path}")
                    
                    # Use the converted WAV file
                    audio_file_to_process = wav_file_path
                except Exception as e:
                    print(f"Error converting audio with pydub: {e}")
                    import traceback
                    traceback.print_exc()
                    print("Fallback to original file (may cause speech recognition error)")
                    # Fallback to original file
                    audio_file_to_process = temp_file_path
        else:
            print("File is already WAV format, no conversion needed")
            audio_file_to_process = temp_file_path
        
        # Khởi tạo recognizer
        recognizer = sr.Recognizer()
        print("Speech recognizer initialized")
        
        # Đọc file audio
        print("Reading audio file...")
        with sr.AudioFile(audio_file_to_process) as source:
            audio_data = recognizer.record(source)
        print("Audio data recorded successfully")
        
        # Chuyển đổi speech thành text
        try:
            print("Converting speech to text...")
            # Sử dụng Google Speech Recognition
            text = recognizer.recognize_google(audio_data, language="vi-VN")
            print(f"Speech recognition successful: {text}")
            return SpeechToTextResponse(success=True, text=text)
        except sr.UnknownValueError:
            print("Speech recognition: Could not understand audio")
            return SpeechToTextResponse(success=False, error="Could not understand audio")
        except sr.RequestError as e:
            print(f"Speech recognition request error: {e}")
            return SpeechToTextResponse(success=False, error=f"Could not request results; {e}")
        
    except Exception as e:
        print(f"ERROR in speech-to-text: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    
    finally:
        # Xóa file tạm thời
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            print(f"Temporary file deleted: {temp_file_path}")
        
        # Xóa file WAV đã convert (nếu có)
        if wav_file_path and os.path.exists(wav_file_path):
            os.unlink(wav_file_path)
            print(f"Converted WAV file deleted: {wav_file_path}")

@app.post("/v1/speech-to-text-chunked")
async def speech_to_text_chunked(audio_file: UploadFile = File(...), chunk_duration: int = 5):
    """
    Enhanced speech-to-text with audio chunking for better performance
    
    Args:
        audio_file: Audio file to process
        chunk_duration: Duration of each chunk in seconds (default: 5)
    """
    print(f"Chunked speech-to-text request received. File: {audio_file.filename}, Chunk duration: {chunk_duration}s")
    
    if sr is None:
        print("ERROR: speech_recognition library not available")
        raise HTTPException(status_code=500, detail="speech_recognition library not available")
    
    if AudioChunker is None or ParallelSpeechRecognizer is None:
        print("WARNING: Audio chunking utilities not available, falling back to regular processing")
        # Fallback to regular speech-to-text
        return await speech_to_text(audio_file)
    
    temp_file_path = None
    wav_file_path = None
    chunk_files = []
    
    try:
        print(f"Received audio file: {audio_file.filename}, content_type: {audio_file.content_type}")
        
        # Đọc nội dung file
        content = await audio_file.read()
        print(f"Audio file size: {len(content)} bytes")
        
        # Xác định extension dựa trên content type
        file_extension = ".webm"
        if audio_file.content_type:
            if "webm" in audio_file.content_type:
                file_extension = ".webm"
            elif "ogg" in audio_file.content_type:
                file_extension = ".ogg"
            elif "mp4" in audio_file.content_type or "m4a" in audio_file.content_type:
                file_extension = ".m4a"
            elif "wav" in audio_file.content_type:
                file_extension = ".wav"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
            print(f"Temporary file created: {temp_file_path}")
        
        # Convert to WAV if not already WAV
        if file_extension != ".wav":
            if AudioSegment is None:
                print("WARNING: pydub not available, cannot convert audio format")
                audio_file_to_process = temp_file_path
            else:
                print(f"Converting {file_extension} to WAV using pydub...")
                try:
                    # Load audio file with pydub
                    print(f"Loading audio file: {temp_file_path}")
                    audio = AudioSegment.from_file(temp_file_path)
                    print(f"Audio loaded successfully. Duration: {len(audio)}ms, Channels: {audio.channels}, Frame rate: {audio.frame_rate}")
                    audio = audio.set_frame_rate(16000).set_channels(1)
                    
                    # Create WAV file
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav_file:
                        wav_file_path = wav_file.name
                    
                    # Export as WAV
                    print(f"Exporting to WAV: {wav_file_path}")
                    audio.export(wav_file_path, format="wav")
                    print(f"Audio converted to WAV successfully: {wav_file_path}")
                    
                    # Use the converted WAV file
                    audio_file_to_process = wav_file_path
                except Exception as e:
                    print(f"Error converting audio with pydub: {e}")
                    import traceback
                    traceback.print_exc()
                    print("Fallback to original file (may cause speech recognition error)")
                    # Fallback to original file
                    audio_file_to_process = temp_file_path
        else:
            print("File is already WAV format, no conversion needed")
            audio_file_to_process = temp_file_path
        
        # Chunk the audio file
        print(f"Chunking audio into {chunk_duration}s segments...")
        chunker = AudioChunker(chunk_duration_ms=chunk_duration * 1000)
        chunk_files = chunker.chunk_audio_file(audio_file_to_process)
        print(f"Audio chunked into {len(chunk_files)} segments")
        
        if not chunk_files:
            print("No chunks created, falling back to regular processing")
            # Fallback to regular processing
            recognizer = sr.Recognizer()
            with sr.AudioFile(audio_file_to_process) as source:
                audio_data = recognizer.record(source)
            
            try:
                text = recognizer.recognize_google(audio_data, language="vi-VN")
                return SpeechToTextResponse(success=True, text=text)
            except sr.UnknownValueError:
                return SpeechToTextResponse(success=False, error="Could not understand audio")
            except sr.RequestError as e:
                return SpeechToTextResponse(success=False, error=f"Could not request results; {e}")
        
        # Process chunks in parallel
        print("Processing chunks in parallel...")
        recognizer = ParallelSpeechRecognizer(max_workers=3)
        combined_text = await recognizer.recognize_chunks_parallel(chunk_files, language="vi-VN")
        
        if combined_text:
            print(f"Chunked speech recognition successful: {combined_text}")
            return SpeechToTextResponse(success=True, text=combined_text)
        else:
            print("Chunked speech recognition: Could not understand audio")
            return SpeechToTextResponse(success=False, error="Could not understand audio")
        
    except Exception as e:
        print(f"ERROR in chunked speech-to-text: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    
    finally:
        # Cleanup temporary files
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            print(f"Temporary file deleted: {temp_file_path}")
        
        if wav_file_path and os.path.exists(wav_file_path):
            os.unlink(wav_file_path)
            print(f"Converted WAV file deleted: {wav_file_path}")
        
        # Cleanup chunk files
        if chunk_files and AudioChunker is not None:
            chunker = AudioChunker()
            chunker.cleanup_chunks(chunk_files)
            print(f"Cleaned up {len(chunk_files)} chunk files")

@app.post("/v1/speech-chat-optimized")
async def speech_chat_optimized(audio_file: UploadFile = File(...)):
    """
    Optimized speech-to-speech chat with chunking for better performance
    """
    print("=== OPTIMIZED SPEECH CHAT STARTED ===")
    
    try:
        # Step 1: Speech-to-Text with chunking
        print("Step 1: Processing speech-to-text with chunking...")
        
        if AudioChunker is not None and ParallelSpeechRecognizer is not None:
            # Use chunked processing
            # Reset file pointer to beginning
            await audio_file.seek(0)
            stt_response = await speech_to_text_chunked(audio_file, chunk_duration=3)
            if not stt_response.success:
                raise HTTPException(status_code=400, detail=stt_response.error or "Speech recognition failed")
            user_text = stt_response.text
        else:
            # Fallback to regular processing
            print("Chunking not available, using regular speech-to-text...")
            # Reset file pointer to beginning
            await audio_file.seek(0)
            stt_response = await speech_to_text(audio_file)
            if not stt_response.success:
                raise HTTPException(status_code=400, detail=stt_response.error or "Speech recognition failed")
            user_text = stt_response.text
        
        print(f"User speech recognized: {user_text}")
        
        # Step 2: AI Chat Processing
        print("Step 2: Processing AI chat...")
        
        # Create chat request
        chat_request = ChatRequest(
            messages=[
                ChatMessage(role="system", content="Bạn là một trợ lý AI y tế thông minh và hữu ích. Hãy trả lời các câu hỏi về sức khỏe một cách chính xác và dễ hiểu. Luôn khuyên người dùng tham khảo ý kiến bác sĩ chuyên khoa khi cần thiết."),
                ChatMessage(role="user", content=user_text)
            ],
            temperature=0.7,
            max_tokens=300  # Limit response length for faster TTS
        )
        
        # Get AI response
        chat_response = await chat_completions(chat_request)
        ai_response = chat_response.choices[0].message.content
        print(f"AI response generated: {ai_response[:100]}...")
        
        # Step 3: Text-to-Speech with streaming
        print("Step 3: Processing text-to-speech with streaming...")
        
        if TextChunker is not None:
            # Use streaming TTS
            tts_request = TextToSpeechRequest(text=ai_response, lang="vi")
            tts_response = await text_to_speech_streaming(tts_request)
        else:
            # Fallback to regular TTS
            print("Text chunking not available, using regular text-to-speech...")
            tts_request = TextToSpeechRequest(text=ai_response, lang="vi")
            tts_response = await text_to_speech(tts_request)
        
        print("=== OPTIMIZED SPEECH CHAT COMPLETED ===")
        
        return {
            "success": True,
            "user_text": user_text,
            "ai_response": ai_response,
            "audio_filename": tts_response["filename"],
            "audio_url": tts_response["download_url"],
            "optimized": True,
            "chunking_used": {
                "speech_to_text": AudioChunker is not None,
                "text_to_speech": TextChunker is not None,
                "chunks_processed": tts_response.get("chunks_processed", 1)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in optimized speech chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error in optimized speech chat: {str(e)}")

@app.post("/v1/vision-chat")
async def vision_chat(req: VisionChatRequest):
    if not req.image_base64 or not req.text:
        raise HTTPException(status_code=400, detail="Both image_base64 and text are required")
    try:
        base = _get_proxy_base()
        headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
        auth = os.environ.get("LLAMA_SERVER_AUTH", "").strip()
        if auth:
            headers["Authorization"] = auth
        gpu_try_1 = requests.post(f"{base.rstrip('/')}/v1/vision-chat", headers=headers, data=json.dumps(req.dict()), timeout=60)
        if gpu_try_1.ok:
            _append_runtime_event({"type": "vision_mode_used", "mode": "gpu", "endpoint": "vision-chat", "ts": datetime.datetime.utcnow().isoformat()})
            data = gpu_try_1.json()
            return VisionChatResponse(success=bool(data.get("success", True)), response=data.get("response"), error=data.get("error"))
        gpu_payload = {"text": req.text, "images_base64": [req.image_base64], "model_id": "5CD-AI/Vintern-3B-R-beta"}
        gpu_try_2 = requests.post(f"{base.rstrip('/')}/v1/vision-multi", headers=headers, data=json.dumps(gpu_payload), timeout=60)
        if gpu_try_2.ok:
            _append_runtime_event({"type": "vision_mode_used", "mode": "gpu", "endpoint": "vision-multi", "ts": datetime.datetime.utcnow().isoformat()})
            data = gpu_try_2.json()
            return VisionChatResponse(success=bool(data.get("success", True)), response=data.get("response"), error=data.get("error"))
    except Exception:
        pass
    just_loaded = ensure_vlm_model()
    if vlm_llm is None:
        return VisionChatResponse(success=False, error="VLM model not available")
    try:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": req.text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{req.image_base64}"
                        }
                    }
                ]
            }
        ]
        response = vlm_llm.create_chat_completion(messages=messages, temperature=req.temperature, max_tokens=req.max_tokens)
        response_text = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        _append_runtime_event({"type": "vision_mode_used", "mode": "cpu", "endpoint": "local-vlm", "model_init": bool(just_loaded), "ts": datetime.datetime.utcnow().isoformat()})
        return VisionChatResponse(success=True, response=response_text)
    except Exception as e:
        return VisionChatResponse(success=False, error=f"Error processing vision chat: {str(e)}")

def _extract_text_from_doc(doc_base64: str, doc_name: str) -> str:
    import base64
    import io
    
    try:
        decoded = base64.b64decode(doc_base64)
        file_stream = io.BytesIO(decoded)
        ext = doc_name.split('.')[-1].lower()
        
        text = ""
        if ext == 'pdf':
            if pypdf:
                reader = pypdf.PdfReader(file_stream)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            else:
                return "Error: pypdf library not found."
        elif ext in ['docx', 'doc']:
            if docx:
                doc = docx.Document(file_stream)
                for para in doc.paragraphs:
                    text += para.text + "\n"
            else:
                return "Error: python-docx library not found."
        else:
            # Try text decode for other formats
            try:
                text = decoded.decode('utf-8')
            except:
                return "Error: Unsupported document format."
                
        return text.strip()
    except Exception as e:
        return f"Error extracting text: {str(e)}"

@app.post("/v1/document-chat")
async def document_chat(req: DocumentChatRequest):
    if not req.doc_base64 or not req.text:
        raise HTTPException(status_code=400, detail="doc_base64 and text are required")
    
    # Check if GPU is available and proxy if needed
    base_url = _get_proxy_base()
    if base_url:
        try:
            gpu_url = f"{base_url}/v1/document-chat"
            print(f"Proxying document-chat to GPU: {gpu_url}")
            # Add ngrok-skip-browser-warning header
            headers = {"ngrok-skip-browser-warning": "true"}
            resp = requests.post(gpu_url, json=req.dict(), headers=headers, timeout=120)
            
            # DEBUG: Print GPU response for troubleshooting
            print(f"GPU Response Status: {resp.status_code}")
            try:
                print(f"GPU Response Body Preview: {resp.text[:200]}")
            except:
                pass

            if resp.ok:
                return resp.json()
            else:
                # If GPU fails, fallback to local
                print(f"GPU proxy failed ({resp.status_code}), falling back to local processing.")
        except Exception as e:
            print(f"GPU proxy error: {e}, falling back to local processing.")

    # Extract text from document (Local Fallback)
    doc_text = _extract_text_from_doc(req.doc_base64, req.doc_name)
    if doc_text.startswith("Error:"):
        return VisionChatResponse(success=False, error=doc_text)
        
    # Construct prompt
    full_prompt = f"Tài liệu đính kèm ({req.doc_name}):\n\n{doc_text}\n\n---\n\nCâu hỏi của người dùng: {req.text}"
    
    # Delegate to chat/completions logic
    try:
        chat_req = ChatRequest(
            model=req.model,
            messages=[
                ChatMessage(role="system", content="Bạn là trợ lý AI hữu ích. Hãy trả lời câu hỏi dựa trên tài liệu được cung cấp."),
                ChatMessage(role="user", content=full_prompt)
            ]
        )
        
        # Use local loopback to reuse chat logic
        local_url = "http://127.0.0.1:8000/v1/chat/completions"
        resp = requests.post(local_url, json=chat_req.dict(), timeout=120)
        
        if resp.ok:
            data = resp.json()
            content = ""
            if "choices" in data:
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return VisionChatResponse(success=True, response=content)
        else:
            return VisionChatResponse(success=False, error=f"Chat error: {resp.text}")
            
    except Exception as e:
        return VisionChatResponse(success=False, error=str(e))

@app.post("/v1/login")
async def login(req: LoginRequest):
    u = _load_user()
    input_user = req.username.strip()
    input_pass = req.password.strip()
    if not input_user or not input_pass:
        raise HTTPException(status_code=400, detail="Thiếu username hoặc password")
    if input_user != u.get("username"):
        raise HTTPException(status_code=401, detail="Thông tin đăng nhập không hợp lệ")
    salt = u.get("salt") or ""
    stored_hash = u.get("password_hash") or ""
    if stored_hash:
        calc = _hash_password(input_pass, salt)
        if calc != stored_hash:
            raise HTTPException(status_code=401, detail="Thông tin đăng nhập không hợp lệ")
    user_id = input_user.strip().lower()
    token = f"mock-{user_id}"
    _ensure_user(user_id)
    return LoginResponse(user_id=user_id, token=token)

@app.post("/v1/logout")
async def logout():
    return {"success": True}

@app.get("/v1/user")
async def get_user_profile() -> UserProfile:
    u = _load_user()
    return UserProfile(username=u.get("username") or "", has_password=bool(u.get("password_hash")))

@app.put("/v1/user")
async def update_user_profile(req: UserUpdate):
    u = _load_user()
    new_username = req.username.strip()
    if not new_username:
        raise HTTPException(status_code=400, detail="Username không hợp lệ")
    u["username"] = new_username
    if req.password and req.password.strip():
        import uuid as _uuid
        salt = _uuid.uuid4().hex
        u["salt"] = salt
        u["password_hash"] = _hash_password(req.password.strip(), salt)
    _save_user(u)
    return {"success": True}

@app.post("/v1/register")
async def register(req: RegisterRequest):
    if not req.username.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="Thiếu username hoặc password")
    u = _load_user()
    if u.get("username") and u.get("username").strip().lower() == req.username.strip().lower():
        raise HTTPException(status_code=409, detail="Tài khoản đã tồn tại")
    import uuid as _uuid
    salt = _uuid.uuid4().hex
    data = {"username": req.username.strip(), "salt": salt, "password_hash": _hash_password(req.password.strip(), salt)}
    _save_user(data)
    return {"success": True}

@app.post("/v1/login/google")
async def login_google(req: GoogleLoginRequest):
    token = req.id_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Thiếu id_token")
    try:
        r = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": token}, timeout=10)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="id_token không hợp lệ")
        info = r.json()
        email = str(info.get("email") or "").strip()
        if not email:
            raise HTTPException(status_code=401, detail="Không lấy được email từ id_token")
        u = _load_user()
        u["username"] = email
        u["salt"] = ""
        u["password_hash"] = ""
        _save_user(u)
        user_id = email.strip().lower()
        _ensure_user(user_id)
        return LoginResponse(user_id=user_id, token=f"mock-{user_id}")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi xử lý đăng nhập Google")

@app.get("/v1/conversations")
async def list_conversations(request: Request):
    user_id = get_current_user(request)
    _ensure_user(user_id)
    items = list(MOCK_CHAT_DB[user_id]["conversations"].values())
    items.sort(key=lambda x: x["last_active"], reverse=True)
    return {
        "conversations": [
            {
                "id": c["id"],
                "title": c.get("title", ""),
                "last_active": c["last_active"].isoformat()
            } for c in items
        ]
    }

@app.get("/v1/conversations/{conv_id}")
async def get_conversation(conv_id: str, request: Request, page: int = 1, page_size: int = 50):
    user_id = get_current_user(request)
    _ensure_user(user_id)
    conv = MOCK_CHAT_DB[user_id]["conversations"].get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    data = paginate_items(conv.get("messages", []), page, page_size)
    return {
        "id": conv_id,
        "title": conv.get("title", ""),
        "last_active": conv["last_active"].isoformat(),
        "messages": data.get("items", [])
    }

@app.post("/v1/conversations/start")
async def start_conversation(request: Request):
    """Create a new empty conversation for current user and return its id.
    Optional JSON body: { "title": string }
    """
    user_id = get_current_user(request)
    _ensure_user(user_id)
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    title = ""
    if isinstance(payload, dict):
        t = payload.get("title")
        if isinstance(t, str):
            title = t.strip()
    conv_id = create_conversation(user_id, title or None)
    conv = MOCK_CHAT_DB[user_id]["conversations"].get(conv_id, {})
    return {
        "id": conv_id,
        "title": conv.get("title", ""),
        "last_active": conv.get("last_active", datetime.datetime.utcnow).isoformat() if conv.get("last_active") else datetime.datetime.utcnow().isoformat()
    }

@app.post("/v1/conversations/new")
async def new_conversation(request: Request):
    user_id = get_current_user(request)
    _ensure_user(user_id)
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    title = ""
    if isinstance(payload, dict):
        t = payload.get("title")
        if isinstance(t, str):
            title = t.strip()
    conv_id = create_conversation(user_id, title or None)
    conv = MOCK_CHAT_DB[user_id]["conversations"].get(conv_id, {})
    last_active = conv.get("last_active")
    ts = last_active.isoformat() if last_active else datetime.datetime.utcnow().isoformat()
    return {
        "conversation_id": conv_id,
        "id": conv_id,
        "title": conv.get("title", ""),
        "last_active": ts
    }

@app.patch("/v1/conversations/{conv_id}/title")
async def update_conversation_title(conv_id: str, request: Request):
    payload = await request.json()
    title = str(payload.get("title", "")).strip()
    user_id = get_current_user(request)
    _ensure_user(user_id)
    conv = MOCK_CHAT_DB[user_id]["conversations"].get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["title"] = title
    return {"success": True, "id": conv_id, "title": title}

@app.post("/v1/conversations/{conv_id}/auto-title")
async def auto_title(conv_id: str, request: Request):
    user_id = get_current_user(request)
    _ensure_user(user_id)
    conv = MOCK_CHAT_DB[user_id]["conversations"].get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = conv.get("messages", [])
    last_user = None
    last_assistant = None
    for m in reversed(msgs):
        if m.get("role") == "assistant" and last_assistant is None:
            last_assistant = m
        if m.get("role") == "user" and last_user is None:
            last_user = m
        if last_user and last_assistant:
            break
    user_text = (last_user or {}).get("content", "")
    ai_text = (last_assistant or {}).get("content", "")
    title = generate_auto_title(user_text, ai_text)
    conv["title"] = title
    return {"success": True, "id": conv_id, "title": title}

@app.delete("/v1/conversations/{conv_id}")
async def delete_conversation(conv_id: str, request: Request):
    user_id = get_current_user(request)
    _ensure_user(user_id)
    convs = MOCK_CHAT_DB[user_id]["conversations"]
    if conv_id not in convs:
        raise HTTPException(status_code=404, detail="Conversation not found")
    del convs[conv_id]
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
