# @title 6. Khởi chạy Server API (VRAM Safe Mode)
from fastapi import FastAPI, File, UploadFile, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import nest_asyncio
from pyngrok import ngrok
from PIL import Image
import librosa
import soundfile as sf
import numpy as np
from gtts import gTTS
import threading
import time
import socket
import uuid
import gc
import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, AutoModel
import torchvision.transforms as T
from torchvision.transforms.functional import InterpolationMode
from peft import PeftModel
from fastapi import Body
import re
import base64
from io import BytesIO
import asyncio

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None

# Patch async cho Colab
try:
    nest_asyncio.apply()
except Exception:
    pass

app = FastAPI(title="Medical Consultation GPU API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_engine = None
ocr_last_error = None
ocr_backend = None

def _ensure_ocr():
    global ocr_engine, ocr_last_error, ocr_backend
    if ocr_engine is not None:
        return True
    try:
        import sys
        if 'paddleocr' in sys.modules:
            PaddleOCR = sys.modules['paddleocr'].PaddleOCR
        else:
            from paddleocr import PaddleOCR  # lazy import to avoid PDX reinit issues
        print("⏳ Đang tải PaddleOCR cho tiếng Việt...")
        try:
            ocr_engine = PaddleOCR(use_angle_cls=True, lang='vi', show_log=False)
        except Exception as e_vi:
            ocr_last_error = str(e_vi)
            try:
                ocr_engine = PaddleOCR(use_angle_cls=True, lang='latin', show_log=False)
            except Exception as e_lat:
                ocr_last_error = f"{str(e_vi)} | {str(e_lat)}"
                try:
                    ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
                except Exception as e_en:
                    ocr_last_error = f"{str(e_vi)} | {str(e_lat)} | {str(e_en)}"
                    raise e_en
        print("✅ PaddleOCR đã sẵn sàng!")
        ocr_last_error = None
        ocr_backend = "paddle"
        return True
    except RuntimeError:
        try:
            import sys
            if 'paddleocr' in sys.modules:
                PaddleOCR = sys.modules['paddleocr'].PaddleOCR
                try:
                    ocr_engine = PaddleOCR(use_angle_cls=True, lang='vi', show_log=False)
                except Exception as e_vi:
                    ocr_last_error = str(e_vi)
                    try:
                        ocr_engine = PaddleOCR(use_angle_cls=True, lang='latin', show_log=False)
                    except Exception as e_lat:
                        ocr_last_error = f"{str(e_vi)} | {str(e_lat)}"
                        ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            ocr_last_error = None
            ocr_backend = "paddle"
            return True
        except Exception as e:
            ocr_last_error = str(e)
        try:
            import easyocr
            langs = ['vi', 'en']
            try:
                ocr_engine = easyocr.Reader(langs, gpu=torch.cuda.is_available())
                ocr_backend = "easyocr"
                ocr_last_error = None
                return True
            except Exception as e2:
                ocr_last_error = f"{ocr_last_error or ''} | {str(e2)}"
        except Exception as e3:
            ocr_last_error = f"{ocr_last_error or ''} | {str(e3)}"
        return False
    except Exception as e:
        ocr_last_error = str(e)
        return False

# --- CẬP NHẬT PHẦN NÀY TRONG CELL 6 ---

vintern_model = None
vintern_tokenizer = None

def _ensure_vintern():
    global vintern_model, vintern_tokenizer
    if vintern_model is not None and vintern_tokenizer is not None:
        return True
    
    model_id = "5CD-AI/Vintern-3B-R-beta"
    print(f"⏳ Đang tải mô hình Vision: {model_id}...")
    try:
        # Tải model với bfloat16 để tiết kiệm VRAM và giữ độ chính xác
        vintern_model = AutoModel.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            use_flash_attn=False # Bật True nếu GPU hỗ trợ Flash Attention 2 (A100, H100, L4...)
        ).eval().cuda()
        
        vintern_tokenizer = AutoTokenizer.from_pretrained(
            model_id, 
            trust_remote_code=True, 
            use_fast=False
        )
        print("✅ Vintern-3B đã sẵn sàng!")
        return True
    except Exception as e:
        print(f"❌ Lỗi tải Vintern-3B: {e}")
        vintern_model = None
        vintern_tokenizer = None
        return False



IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

def _build_transform(input_size: int):
    return T.Compose([
        T.Lambda(lambda img: img.convert('RGB') if img.mode != 'RGB' else img),
        T.Resize((input_size, input_size), interpolation=InterpolationMode.BICUBIC),
        T.ToTensor(),
        T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

def _find_closest_aspect_ratio(aspect_ratio: float, target_ratios: list, width: int, height: int, image_size: int):
    best_ratio_diff = float('inf')
    best_ratio = (1, 1)
    area = width * height
    for ratio in target_ratios:
        target_aspect_ratio = ratio[0] / ratio[1]
        ratio_diff = abs(aspect_ratio - target_aspect_ratio)
        if ratio_diff < best_ratio_diff:
            best_ratio_diff = ratio_diff
            best_ratio = ratio
        elif ratio_diff == best_ratio_diff:
            if area > 0.5 * image_size * image_size * ratio[0] * ratio[1]:
                best_ratio = ratio
    return best_ratio

def _dynamic_preprocess(image: Image.Image, min_num: int = 1, max_num: int = 12, image_size: int = 448, use_thumbnail: bool = False):
    orig_width, orig_height = image.size
    aspect_ratio = orig_width / orig_height
    target_ratios = set((i, j) for n in range(min_num, max_num + 1) for i in range(1, n + 1) for j in range(1, n + 1) if i * j <= max_num and i * j >= min_num)
    target_ratios = sorted(target_ratios, key=lambda x: x[0] * x[1])
    target_aspect_ratio = _find_closest_aspect_ratio(aspect_ratio, target_ratios, orig_width, orig_height, image_size)
    target_width = image_size * target_aspect_ratio[0]
    target_height = image_size * target_aspect_ratio[1]
    blocks = target_aspect_ratio[0] * target_aspect_ratio[1]
    resized_img = image.resize((target_width, target_height))
    processed_images = []
    for i in range(blocks):
        box = ((i % (target_width // image_size)) * image_size, (i // (target_width // image_size)) * image_size, ((i % (target_width // image_size)) + 1) * image_size, ((i // (target_width // image_size)) + 1) * image_size)
        split_img = resized_img.crop(box)
        processed_images.append(split_img)
    if use_thumbnail and len(processed_images) != 1:
        thumbnail_img = image.resize((image_size, image_size))
        processed_images.append(thumbnail_img)
        return processed_images

def _perform_ocr(image: Image.Image) -> str:
    try:
        if ocr_backend == "paddle":
            import numpy as _np
            result = ocr_engine.ocr(_np.array(image), cls=True)
            if result and len(result) > 0 and isinstance(result[0], list):
                return "\n".join([line[1][0] for line in result[0] if isinstance(line, list) and len(line) > 1])
            return ""
        if ocr_backend == "easyocr":
            import numpy as _np
            lines = ocr_engine.readtext(_np.array(image), detail=1)
            texts = []
            for item in lines:
                try:
                    t = item[1]
                    if isinstance(t, str) and t.strip():
                        texts.append(t.strip())
                except Exception:
                    pass
            return "\n".join(texts)
        return ""
    except Exception:
        return ""

def _pixels_from_image(image: Image.Image, input_size: int = 448, max_num: int = 6):
    transform = _build_transform(input_size=input_size)
    images = _dynamic_preprocess(image, image_size=input_size, use_thumbnail=True, max_num=max_num)
    pixel_values = [transform(img) for img in images]
    return torch.stack(pixel_values)

# ==============================
# 🔶 DATA MODELS
# ==============================
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: Optional[str] = "llama-3.2-3b"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512
    mode: Optional[str] = "pro"

class VisionMultiRequest(BaseModel):
    text: str
    images_base64: List[str]
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 256
    model_id: Optional[str] = None

class DocumentChatRequest(BaseModel):
    text: str
    doc_base64: str
    doc_name: str
    model: Optional[str] = "flash"

class VisionChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    lang: Optional[str] = "vi"
class AutoTitleRequest(BaseModel):
    messages: Optional[List[ChatMessage]] = None
    user_text: Optional[str] = None
    assistant_text: Optional[str] = None
    max_tokens: Optional[int] = 24
class HealthLookupRequest(BaseModel):
    query: str
    mode: Optional[str] = None
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

FRIEND_LORA_REPO = os.environ.get("FRIEND_LORA_REPO", "An-CNT/doctorai-tamly-lora-v2-final")
FRIEND_BASE_MODEL = os.environ.get("FRIEND_BASE_MODEL", "unsloth/Llama-3.2-3B-Instruct")
_friend_bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16
)
friend_lora_tokenizer = None
friend_lora_model = None
def _ensure_friend_lora():
    global friend_lora_tokenizer, friend_lora_model
    if friend_lora_tokenizer is not None and friend_lora_model is not None:
        return True
    try:
        base_model = AutoModelForCausalLM.from_pretrained(FRIEND_BASE_MODEL, quantization_config=_friend_bnb_config, device_map="auto")
        friend_lora_model = PeftModel.from_pretrained(base_model, FRIEND_LORA_REPO)
        friend_lora_model.eval()
        friend_lora_tokenizer = AutoTokenizer.from_pretrained(FRIEND_LORA_REPO, use_fast=True)
        return True
    except Exception:
        try:
            base_model = AutoModelForCausalLM.from_pretrained(FRIEND_BASE_MODEL, torch_dtype=torch.bfloat16, device_map="auto")
            friend_lora_model = PeftModel.from_pretrained(base_model, FRIEND_LORA_REPO)
            friend_lora_model.eval()
            friend_lora_tokenizer = AutoTokenizer.from_pretrained(FRIEND_LORA_REPO, use_fast=True)
            return True
        except Exception:
            return False

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
        return VisionChatResponse(success=False, error="doc_base64 and text are required")
        
    # Extract text from document
    doc_text = _extract_text_from_doc(req.doc_base64, req.doc_name)
    if doc_text.startswith("Error:"):
        return VisionChatResponse(success=False, error=doc_text)
        
    # Construct prompt
    full_prompt = f"Tài liệu đính kèm ({req.doc_name}):\n\n{doc_text}\n\n---\n\nCâu hỏi của người dùng: {req.text}"
    
    # Delegate to chat logic
    try:
        chat_req = ChatRequest(
            model=req.model,
            messages=[
                ChatMessage(role="system", content="Bạn là trợ lý AI hữu ích. Hãy trả lời câu hỏi dựa trên tài liệu được cung cấp."),
                ChatMessage(role="user", content=full_prompt)
            ]
        )
        
        # Reuse chat logic directly since we are on the same server
        response_dict = await chat_completions(chat_req)
        
        if isinstance(response_dict, dict):
             content = response_dict.get("choices", [{}])[0].get("message", {}).get("content", "")
             return VisionChatResponse(success=True, response=content)
        else:
            # Handle if chat_completions returns JSONResponse
            import json
            body = json.loads(response_dict.body)
            if "error" in body:
                return VisionChatResponse(success=False, error=body["error"])
            content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
            return VisionChatResponse(success=True, response=content)
            
    except Exception as e:
        return VisionChatResponse(success=False, error=str(e))

# ==============================
# 🔷 1. CHAT API
# ==============================
@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest, x_mode: Optional[str] = Header(None)):
    try:
        msgs = req.messages or []
        question = ""
        for m in reversed(msgs):
            if m.role.lower() == "user":
                question = m.content
                break
        if not question and msgs:
            question = msgs[-1].content
        try:
            if question:
                print(f"[USER] { question }")
        except Exception:
            pass
        mode = (x_mode or req.mode or "pro").lower()
        classify_prompt = "trả lời ngắn gọn là có hay không và không giải thích gì thêm: câu hỏi sau đây có liên quan y tế không: " + question
        cls_text_tmpl = chat_tokenizer.apply_chat_template([{"role": "user", "content": classify_prompt}], tokenize=False, add_generation_prompt=True)
        cls_inputs = chat_tokenizer(cls_text_tmpl, return_tensors="pt").to("cuda")
        with torch.no_grad():
            cls_out = chat_model.generate(**cls_inputs, max_new_tokens=8, temperature=0, do_sample=False, pad_token_id=chat_tokenizer.eos_token_id)
        cls_resp = chat_tokenizer.decode(cls_out[0][cls_inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        del cls_inputs, cls_out
        torch.cuda.empty_cache()
        if "không" in cls_resp.lower():
            response_text = "Câu hỏi của bạn không liên quan đến y tế. Vui lòng đặt câu hỏi khác."
            return {
                "id": f"chatcmpl-{uuid.uuid4()}",
                "object": "chat.completion",
                "created": int(time.time()),
                "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
                "mode": mode
            }
        if mode == "pro":
            nodes = retriever.retrieve(question)
            context_passages = [n.node.get_content() for n in nodes]
            ranked = context_passages
            try:
                if reranker is not None:
                    query_passage_pairs = [[question, p] for p in context_passages]
                    scores = reranker.predict(query_passage_pairs)
                    ranked = [p for _, p in sorted(zip(scores, context_passages), key=lambda x: x[0], reverse=True)]
            except Exception:
                ranked = context_passages
            top_k = min(3, len(ranked))
            selected = ranked[:top_k]
            ctx = "Đây là câu hỏi của người dùng:\n" + question + "\n\n"
            ctx += "Dưới đây là các đoạn thông tin liên quan:\n"
            for i, p in enumerate(selected):
                ctx += "\n[Đoạn " + str(i + 1) + "]:\n" + p + "\n"
            doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
            input_text = chat_tokenizer.apply_chat_template(
                [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": ctx}],
                tokenize=False,
                add_generation_prompt=True
            )
            inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
            with torch.no_grad():
                output = chat_model.generate(
                    **inputs,
                    max_new_tokens=req.max_tokens,
                    temperature=req.temperature,
                    do_sample=True if req.temperature > 0 else False,
                    pad_token_id=chat_tokenizer.eos_token_id
                )
            response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
            del inputs, output
            torch.cuda.empty_cache()
            rag_info = {"used": True, "retrieved": len(context_passages), "selected": top_k}
        else:
            doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
            input_text = chat_tokenizer.apply_chat_template(
                [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": question}],
                tokenize=False,
                add_generation_prompt=True
            )
            inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
            with torch.no_grad():
                output = chat_model.generate(
                    **inputs,
                    max_new_tokens=req.max_tokens,
                    temperature=req.temperature,
                    do_sample=True if req.temperature > 0 else False,
                    pad_token_id=chat_tokenizer.eos_token_id
                )
            response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
            del inputs, output
            torch.cuda.empty_cache()
            rag_info = {"used": False, "retrieved": 0, "selected": 0}
        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(time.time()),
            "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
            "mode": mode,
            "rag": rag_info
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/v1/chat")
async def chat_simple(req: dict, x_mode: Optional[str] = Header(None)):
    # Proxy đơn giản cho chat
    msgs = req.get("messages", [])
    if not msgs: return {"reply": ""}

    question = ""
    for m in reversed(msgs):
        if m.get("role", "").lower() == "user":
            question = m.get("content", "")
            break
    if not question and msgs:
        question = msgs[-1].get("content", "")
    try:
        if question:
            print(f"[USER] { question }")
    except Exception:
        pass
    mode = (x_mode or req.get("mode") or "pro").lower()
    classify_prompt = "trả lời ngắn gọn là có hay không và không giải thích gì thêm: câu hỏi sau đây có liên quan y tế không: " + question
    cls_text_tmpl = chat_tokenizer.apply_chat_template([{"role": "user", "content": classify_prompt}], tokenize=False, add_generation_prompt=True)
    cls_inputs = chat_tokenizer(cls_text_tmpl, return_tensors="pt").to("cuda")
    with torch.no_grad():
        cls_out = chat_model.generate(**cls_inputs, max_new_tokens=8, temperature=0, do_sample=False, pad_token_id=chat_tokenizer.eos_token_id)
    cls_resp = chat_tokenizer.decode(cls_out[0][cls_inputs.input_ids.shape[-1]:], skip_special_tokens=True)
    del cls_inputs, cls_out
    torch.cuda.empty_cache()
    if "không" in cls_resp.lower():
        return {"reply": "Câu hỏi của bạn không liên quan đến y tế. Vui lòng đặt câu hỏi khác."}
    if mode == "pro":
        nodes = retriever.retrieve(question)
        context_passages = [n.node.get_content() for n in nodes]
        ranked = context_passages
        try:
            if reranker is not None:
                query_passage_pairs = [[question, p] for p in context_passages]
                scores = reranker.predict(query_passage_pairs)
                ranked = [p for _, p in sorted(zip(scores, context_passages), key=lambda x: x[0], reverse=True)]
        except Exception:
            ranked = context_passages
        top_k = min(3, len(ranked))
        selected = ranked[:top_k]
        ctx = "Đây là câu hỏi của người dùng:\n" + question + "\n\n"
        ctx += "Dưới đây là các đoạn thông tin liên quan:\n"
        for i, p in enumerate(selected):
            ctx += "\n[Đoạn " + str(i + 1) + "]:\n" + p + "\n"
        doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": ctx}],
            tokenize=False,
            add_generation_prompt=True
        )
        rag_info = {"used": True, "retrieved": len(context_passages), "selected": top_k}
    else:
        doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": question}],
            tokenize=False,
            add_generation_prompt=True
        )
        rag_info = {"used": False, "retrieved": 0, "selected": 0}
    inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
    with torch.no_grad():
        output = chat_model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True, pad_token_id=chat_tokenizer.eos_token_id)
    text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
    del inputs, output
    torch.cuda.empty_cache()
    return {"reply": text, "mode": mode, "rag": rag_info}

@app.post("/v1/health-lookup")
async def health_lookup(req: HealthLookupRequest):
    def classify_query(q: str):
        t = (q or "").strip().lower()
        drug_hints = ['thuốc', 'viên', 'mg', 'mcg', 'ml', '%', 'dạng', 'sirô', 'siro', 'kem', 'mỡ', 'ống', 'chai', 'hàm lượng', 'liều']
        disease_hints = ['bệnh', 'hội chứng', 'viêm', 'ung thư', 'tiểu đường', 'cao huyết áp', 'tim mạch', 'hen', 'suy', 'nhiễm', 'virus', 'vi khuẩn', 'vi rút']
        symptom_hints = ['triệu chứng', 'dấu hiệu', 'đau', 'nhức', 'sốt', 'ho', 'mệt', 'mệt mỏi', 'chóng mặt', 'buồn nôn', 'phát ban', 'khó thở', 'tiêu chảy', 'táo bón', 'đau đầu']
        medical_ctx_hints = ['chẩn đoán', 'điều trị', 'phòng ngừa', 'tác dụng phụ', 'dược', 'y khoa', 'bác sĩ', 'liều dùng']
        import re
        is_drug = any(k in t for k in drug_hints) or bool(re.search(r"\b\d+\s?(mg|ml|mcg|%)\b", t))
        is_symptom = any(k in t for k in symptom_hints)
        is_disease = any(k in t for k in disease_hints)
        looks_medical = is_drug or is_symptom or is_disease or any(k in t for k in medical_ctx_hints)
        mode = 'drug' if is_drug else ('disease' if is_disease else ('symptom' if is_symptom else None))
        return {'mode': mode, 'is_medical': looks_medical}
    cls = classify_query(req.query)
    if not cls.get('is_medical'):
        return {
            "success": True,
            "response": "Câu hỏi không có dấu hiệu liên quan đến y tế. Vui lòng nhập tên bệnh, thuốc hoặc triệu chứng.",
            "mode": "gpu",
            "redirect_url": "/tu-van"
        }
    inferred_mode = (req.mode or cls.get('mode') or '').lower()
    root = os.environ.get("DATA_ROOT", "/content/drive/MyDrive/DoctorAI/data")
    data_path = os.path.join(root, "data.json")
    drug_path = os.path.join(root, "thuoc.json")
    def norm(s: str) -> str:
        return (s or "").strip().lower()
    disease_match = None
    drug_match = None
    try:
        if os.path.exists(data_path):
            with open(data_path, "r", encoding="utf-8") as f:
                db = json.load(f)
            if isinstance(db.get("diseases"), list):
                for d in db["diseases"]:
                    name = norm(d.get("name", ""))
                    if name == norm(req.query) or (req.query and norm(req.query) in name):
                        disease_match = d
                        break
            if isinstance(db.get("drugs"), list):
                for dr in db["drugs"]:
                    name = norm(dr.get("name", ""))
                    if name == norm(req.query) or (req.query and norm(req.query) in name):
                        drug_match = dr
                        break
        if os.path.exists(drug_path):
            try:
                with open(drug_path, "r", encoding="utf-8") as f:
                    arr = json.load(f)
                if isinstance(arr, list):
                    for item in arr:
                        name = norm(item.get("name", ""))
                        if name == norm(req.query) or (req.query and norm(req.query) in name):
                            drug_match = {"name": item.get("name", ""), "content": item.get("content", "")}
                            break
            except Exception:
                pass
    except Exception:
        pass
    if inferred_mode == "drug" and drug_match:
        text = f"Thuốc: {drug_match.get('name','')}\n" + (drug_match.get("content") or "")
        return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}
    if inferred_mode == "disease" and disease_match:
        d = disease_match
        parts = []
        if d.get("definition"): parts.append("Định nghĩa: " + d["definition"])
        if d.get("causes"): parts.append("Nguyên nhân: " + (", ".join(d["causes"]) if isinstance(d["causes"], list) else d["causes"]))
        if d.get("symptoms"): parts.append("Triệu chứng: " + (", ".join(d["symptoms"]) if isinstance(d["symptoms"], list) else d["symptoms"]))
        if d.get("diagnosis"): parts.append("Chẩn đoán: " + d["diagnosis"])
        if d.get("treatment"): parts.append("Điều trị: " + d["treatment"])
        if d.get("warnings"): parts.append("Lưu ý: " + d["warnings"])
        text = "Bệnh: " + (d.get("name","")) + "\n" + "\n".join(parts)
        return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}
    if disease_match:
        d = disease_match
        parts = []
        if d.get("definition"): parts.append("Định nghĩa: " + d["definition"])
        if d.get("causes"): parts.append("Nguyên nhân: " + (", ".join(d["causes"]) if isinstance(d["causes"], list) else d["causes"]))
        if d.get("symptoms"): parts.append("Triệu chứng: " + (", ".join(d["symptoms"]) if isinstance(d["symptoms"], list) else d["symptoms"]))
        if d.get("diagnosis"): parts.append("Chẩn đoán: " + d["diagnosis"])
        if d.get("treatment"): parts.append("Điều trị: " + d["treatment"])
        if d.get("warnings"): parts.append("Lưu ý: " + d["warnings"])
        text = "Bệnh: " + (d.get("name","")) + "\n" + "\n".join(parts)
        return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}
    if drug_match:
        text = f"Thuốc: {drug_match.get('name','')}\n" + (drug_match.get("content") or "")
        return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}
    try:
        question = req.query
        nodes = retriever.retrieve(question)
        context_passages = [n.node.get_content() for n in nodes]
        ranked = context_passages
        try:
            if reranker is not None:
                query_passage_pairs = [[question, p] for p in context_passages]
                scores = reranker.predict(query_passage_pairs)
                ranked = [p for _, p in sorted(zip(scores, context_passages), key=lambda x: x[0], reverse=True)]
        except Exception:
            ranked = context_passages
        top_k = min(3, len(ranked))
        selected = ranked[:top_k]
        ctx = "Đây là câu hỏi của người dùng:\n" + question + "\n\n"
        ctx += "Dưới đây là các đoạn thông tin liên quan:\n"
        for i, p in enumerate(selected):
            ctx += "\n[Đoạn " + str(i + 1) + "]:\n" + p + "\n"
        doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": ctx}],
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
        with torch.no_grad():
            output = chat_model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.2,
                do_sample=True,
                pad_token_id=chat_tokenizer.eos_token_id
            )
        response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        return {"success": True, "response": response_text, "conversation_id": req.conversation_id, "mode": "gpu"}
    except Exception as e:
        return {"success": False, "error": str(e), "mode": "gpu"}
# ==============================================================================
# 💎 ULTIMATE ENDPOINT: FRIEND CHAT (DÀNH CHO DEMO HỘI ĐỒNG)
# ==============================================================================
@app.post("/v1/friend-chat/completions")
async def friend_chat_completions(req: ChatRequest, x_mode: Optional[str] = Header(None)):
    try:
        # 1. KỸ THUẬT "FEW-SHOT" + "CHAIN OF THOUGHT"
        # Ép model học theo ví dụ cụ thể để không bị chệch hướng
        friend_system_prompt = (
            "Bạn là DoctorAI - bạn thân cốt, tính cách lầy lội, xưng 'Tui - Bạn'."
            "\nQUY TẮC CỐT LÕI (SUY NGHĨ TRONG NGOẶC TRƯỚC KHI NÓI):"
            "\n1. Xác định rõ: 'Tui' là Bot, 'Bạn' là User. Nếu User khoe tiền, nghĩa là USER trúng, Bot phải đòi ăn ké."
            "\n2. Nếu User buồn: NGHIÊM TÚC, đồng cảm, chửi sếp/chửi đời hộ nó. Cấm đùa."
            "\n3. Nếu User vui/rủ đi chơi: Cà khịa, đòi bao, đòi đi chỗ sang chảnh để trêu."
            "\n4. Tuyệt đối không dùng từ vô nghĩa (như 'chíp xích', 'tào la'). Dùng tiếng Việt chuẩn hoặc slang phổ biến."
            "\n\n*** VÍ DỤ MẪU (BẮT BUỘC HỌC THEO): ***"
            "\nUser: Tao mới bị sếp mắng oan, buồn quá."
            "\nAssistant: (Phân tích: Nó buồn -> Đồng cảm) Trời đất, nghe mà tức cái lồng ngực! Sếp mày bị điên hả? Mày làm tốt thấy mồ mà ổng không thấy. Thôi tối đi làm vài chai giải xui, tao thương."
            "\n\nUser: Ê mới trúng số 500k, đi nhậu không?"
            "\nAssistant: (Phân tích: Nó trúng số -> Đòi ăn ké -> Cà khịa số tiền nhỏ) 500k to quá ha! Đủ trả tiền gửi xe không đó đại gia? Nhưng mà thôi, có lộc là phải tán. Mày bao tao đi ăn ốc lề đường đi, chứ 500k đòi vào nhà hàng 5 sao rửa chén trừ nợ hả?"
            "\n\nUser: Tao thấy cuộc đời vô nghĩa quá..."
            "\nAssistant: (Phân tích: Tiêu cực -> Nghiêm túc) Mày nói bậy bạ gì đó? Có chuyện gì kể tao nghe. Tao ngồi đây nghe mày than thở nè, cấm nghĩ linh tinh!"
            "\n\nBây giờ hãy trả lời câu hỏi mới của người dùng theo phong cách trên."
        )

        msgs_in = req.messages or []
        recent_msgs = msgs_in[-8:] # Giữ ngữ cảnh ngắn gọn cho nhanh

        # Format Chat
        msgs = [{"role": "system", "content": friend_system_prompt}] + \
               [{"role": m.role, "content": m.content} for m in recent_msgs]

        # 2. TINH CHỈNH THAM SỐ (AN TOÀN LÀ TRÊN HẾT)
        mode = (x_mode or (req.mode or "flash")).lower()
        if mode == "pro":
            ok = _ensure_friend_lora()
            if not ok: mode = "flash"

        response_text = ""

        # --- MODE PRO (LORA V2) ---
        if mode == "pro" and friend_lora_model is not None:
            try:
                terminators = [
                    friend_lora_tokenizer.eos_token_id,
                    friend_lora_tokenizer.convert_tokens_to_ids("<|eot_id|>")
                ]

                input_ids = friend_lora_tokenizer.apply_chat_template(
                    msgs, 
                    add_generation_prompt=True, 
                    return_tensors="pt"
                ).to(friend_lora_model.device)
                
                with torch.no_grad():
                    output = friend_lora_model.generate(
                        input_ids,
                        max_new_tokens=256,
                        do_sample=True,
                        temperature=0.55,       # ⚠️ 0.55 giúp bot ổn định, bớt nói nhảm nhưng vẫn tự nhiên
                        top_p=0.9,
                        repetition_penalty=1.15, # Phạt lặp từ mạnh hơn
                        eos_token_id=terminators,
                        pad_token_id=friend_lora_tokenizer.eos_token_id
                    )
                
                raw_response = friend_lora_tokenizer.decode(
                    output[0][input_ids.shape[-1]:], 
                    skip_special_tokens=True
                )
                
                # 3. HẬU XỬ LÝ (GIẤU SUY NGHĨ)
                # Kỹ thuật quan trọng: Cắt bỏ phần (Phân tích: ...) để User chỉ thấy câu trả lời xịn
                import re
                
                # Nếu model lỡ in lại prompt 'Assistant:', cắt bỏ
                if "Assistant:" in raw_response:
                    raw_response = raw_response.split("Assistant:")[-1]
                
                final_response = raw_response
                # Xóa phần nội tâm trong ngoặc (...)
                final_response = re.sub(r'\(Phân tích:.*?\)', '', final_response, flags=re.DOTALL)
                # Xóa khoảng trắng thừa
                response_text = final_response.strip()

                # Fallback: Nếu xóa xong mà rỗng (do lỗi), trả về nguyên gốc
                if not response_text:
                    response_text = raw_response.strip()

                del input_ids, output
                torch.cuda.empty_cache()

            except Exception as e:
                print(f"Error Pro: {e}")
                mode = "flash"

        # --- MODE FLASH (FALLBACK) ---
        if mode != "pro":
            # Xử lý tương tự cho base model...
            input_text = chat_tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
            inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
            try:
                with torch.no_grad():
                    output = chat_model.generate(
                        **inputs,
                        max_new_tokens=200,
                        temperature=0.6,
                        repetition_penalty=1.1,
                        pad_token_id=chat_tokenizer.eos_token_id
                    )
                response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
                # Cũng xóa suy nghĩ nếu có
                response_text = re.sub(r'\(Phân tích:.*?\)', '', response_text, flags=re.DOTALL).strip()
            except: pass

        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(time.time()),
            "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
            "mode": mode
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})





@app.post("/v1/rag/qa")
async def rag_qa(question: str = Body(..., embed=True), max_tokens: int = Body(256), temperature: float = Body(0.3)):
    try:
        q = (question or "").strip()
        if not q:
            return JSONResponse(status_code=400, content={"error": "missing_question"})
        classify_prompt = "trả lời ngắn gọn là có hay không và không giải thích gì thêm: câu hỏi sau đây có liên quan y tế không: " + q
        cls_text_tmpl = chat_tokenizer.apply_chat_template([{"role": "user", "content": classify_prompt}], tokenize=False, add_generation_prompt=True)
        cls_inputs = chat_tokenizer(cls_text_tmpl, return_tensors="pt").to("cuda")
        with torch.no_grad():
            cls_out = chat_model.generate(**cls_inputs, max_new_tokens=8, temperature=0, do_sample=False, pad_token_id=chat_tokenizer.eos_token_id)
        cls_resp = chat_tokenizer.decode(cls_out[0][cls_inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        del cls_inputs, cls_out
        torch.cuda.empty_cache()
        if "không" in cls_resp.lower():
            return {"response": "Câu hỏi của bạn không liên quan đến y tế. Vui lòng đặt câu hỏi khác.", "mode": "pro", "classified": "non-medical"}
        nodes = retriever.retrieve(q)
        context_passages = [n.node.get_content() for n in nodes]
        ranked = context_passages
        try:
            if reranker is not None:
                query_passage_pairs = [[q, p] for p in context_passages]
                scores = reranker.predict(query_passage_pairs)
                ranked = [p for _, p in sorted(zip(scores, context_passages), key=lambda x: x[0], reverse=True)]
        except Exception:
            ranked = context_passages
        top_k = min(3, len(ranked))
        selected = ranked[:top_k]
        ctx = "Đây là câu hỏi của người dùng:\n" + q + "\n\n"
        ctx += "Dưới đây là các đoạn thông tin liên quan:\n"
        for i, p in enumerate(selected):
            ctx += "\n[Đoạn " + str(i + 1) + "]:\n" + p + "\n"
        doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": ctx}],
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
        with torch.no_grad():
            output = chat_model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=True if temperature > 0 else False,
                pad_token_id=chat_tokenizer.eos_token_id
            )
        response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        del inputs, output
        torch.cuda.empty_cache()
        return {"response": response_text, "mode": "pro", "top_k": top_k}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
@app.post("/v1/auto-title")
async def auto_title(req: AutoTitleRequest):
    try:
        user_text = req.user_text or ""
        assistant_text = req.assistant_text or ""
        if (not user_text or not assistant_text) and req.messages:
            for m in reversed(req.messages):
                if m.role.lower() == "assistant" and not assistant_text:
                    assistant_text = m.content
                elif m.role.lower() == "user" and not user_text:
                    user_text = m.content
                if user_text and assistant_text:
                    break
        if not user_text:
            user_text = ""
        if not assistant_text:
            assistant_text = ""
        prompt = (
            "Bạn là hệ thống đặt tiêu đề hội thoại. Hãy tạo một tiêu đề tiếng Việt ngắn gọn (4–8 từ) phản ánh đúng trọng tâm.\n"
            "- Không dùng markdown, ký tự đặc biệt, hoặc ngoặc kép\n"
            "- Không lặp từ, định dạng rõ ràng, dễ hiểu\n"
            "- Nếu có số lượng phương pháp/mục, giữ số trong tiêu đề\n"
            "- Ví dụ phong cách: 'Giảm lo âu: 8 phương pháp hiệu quả', 'Chế độ ăn giảm cân an toàn'\n"
            "Dữ liệu hội thoại:\nNgười dùng: " + user_text + "\nTrợ lý: " + assistant_text
        )
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": "Bạn là trợ lý đặt tiêu đề."}, {"role": "user", "content": prompt}],
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
        with torch.no_grad():
            output = chat_model.generate(
                **inputs,
                max_new_tokens=req.max_tokens or 24,
                temperature=0.2,
                do_sample=False,
                pad_token_id=chat_tokenizer.eos_token_id
            )
        title = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True).strip()
        try:
            import re
            title = title.strip()
            title = re.sub(r'[\r\n]+', ' ', title)
            title = re.sub(r'[*_`#]+', '', title)
            title = re.sub(r'\s+', ' ', title)
            title = title[:60]
            if not title:
                title = "Hội thoại"
        except Exception:
            title = (title or "Hội thoại")[:60]
        del inputs, output
        torch.cuda.empty_cache()
        return {"title": title, "mode": "gpu"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ==============================
# 🔶 2. VISION API
# ==============================
# --- CẬP NHẬT API NÀY TRONG CELL 6 ---

@app.post("/v1/vision-multi")
async def vision_multi_api(req: VisionMultiRequest):
    try:
        full_response = []
        
        # 1. Cố gắng khởi tạo Vintern-3B
        has_vintern = _ensure_vintern()
        
        # Xác định Prompt hệ thống dựa trên yêu cầu (để OCR tốt hơn)
        system_instruction = ""
        req_lower = (req.text or "").lower()
        if any(x in req_lower for x in ["đọc", "text", "chữ", "ocr", "trích xuất", "nội dung"]):
            system_instruction = "Bạn là một hệ thống OCR thông minh. Hãy trích xuất chính xác và đầy đủ nội dung văn bản trong ảnh. "
        elif "thuốc" in req_lower or "bệnh" in req_lower:
            system_instruction = (
                "Bạn là một bác sĩ/dược sĩ AI tận tâm. Nhiệm vụ của bạn là đọc hình ảnh đơn thuốc và hướng dẫn bệnh nhân."
                "\n1. Đọc chính xác phần CHẨN ĐOÁN (Diagnosis)."
                "\n2. Đọc kỹ phần THUỐC: Tên thuốc, hàm lượng, số lượng."
                "\n3. QUAN TRỌNG NHẤT: Trích xuất hướng dẫn sử dụng (Sáng/Trưa/Tối, Trước ăn/Sau ăn) để lập lịch uống thuốc dễ hiểu cho bệnh nhân."
                "\n4. Đọc phần LỜI DẶN (Note) của bác sĩ."
                "\nTrình bày câu trả lời rõ ràng, phân chia theo buổi trong ngày."
            )

        for idx, b64_str in enumerate(req.images_base64[:2]): # Xử lý tối đa 2 ảnh
            try:
                # Decode ảnh
                image_bytes = base64.b64decode(b64_str)
                image = Image.open(BytesIO(image_bytes)).convert("RGB")

                # === CÁCH 1: DÙNG VINTERN-3B (Ưu tiên) ===
                if has_vintern and vintern_model is not None:
                    try:
                        # Preprocess ảnh (quan trọng cho Vintern)
                        pixel_values = _pixels_from_image(image, input_size=448, max_num=6).to(torch.bfloat16).cuda()
                        
                        # Tạo prompt chuẩn cho Vintern
                        # Cấu trúc: <image>\n{system_instruction}\n{user_query}
                        question = f"<image>\n{system_instruction}{req.text}"
                        
                        # Cấu hình sinh văn bản
                        gen_config = {
                            "max_new_tokens": req.max_tokens or 512,
                            "do_sample": False, # False giúp OCR chính xác hơn, không bịa
                            "num_beams": 1,
                            "repetition_penalty": 1.1
                        }
                        
                        # Generate
                        response, _ = vintern_model.chat(
                            vintern_tokenizer, 
                            pixel_values, 
                            question, 
                            gen_config, 
                            history=None, 
                            return_history=True
                        )
                        
                        full_response.append(f"[Ảnh {idx+1}]: {response}")
                        
                        # Dọn dẹp GPU ngay lập tức
                        del pixel_values
                        torch.cuda.empty_cache()
                        continue # Xử lý xong ảnh này, sang ảnh tiếp theo

                    except Exception as e_vintern:
                        print(f"⚠️ Lỗi Vintern ảnh {idx+1}, chuyển sang Fallback OCR: {e_vintern}")
                        # Nếu lỗi, code sẽ chạy xuống phần Fallback bên dưới
                
                # === CÁCH 2: FALLBACK (PaddleOCR + Llama/ChatModel) ===
                # (Chỉ chạy khi không có Vintern hoặc Vintern bị lỗi OOM)
                _ensure_ocr()
                if ocr_engine is None:
                    full_response.append(f"[Ảnh {idx+1}]: Lỗi - Không thể tải model Vision hoặc OCR.")
                    continue

                # Chạy PaddleOCR
                result = ocr_engine.ocr(np.array(image), cls=True)
                extracted_text = ""
                if result and result[0]:
                    extracted_text = "\n".join([line[1][0] for line in result[0] if line[1][0]])
                
                if extracted_text.strip():
                    # Đưa text OCR được vào model chat (Llama 3) để tóm tắt/trả lời
                    prompt = f"""
                    Dưới đây là nội dung văn bản được trích xuất từ hình ảnh:
                    ---
                    {extracted_text}
                    ---
                    Dựa vào đó, hãy trả lời câu hỏi: {req.text}
                    """
                    # Gọi hàm chat nội bộ (giả định chat_model đã load ở phần khác của cell 6)
                    input_ids = chat_tokenizer.apply_chat_template(
                        [{"role": "user", "content": prompt}], 
                        tokenize=False, 
                        add_generation_prompt=True
                    )
                    inputs = chat_tokenizer(input_ids, return_tensors="pt").to("cuda")
                    with torch.no_grad():
                        out = chat_model.generate(**inputs, max_new_tokens=req.max_tokens or 256)
                    resp_text = chat_tokenizer.decode(out[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
                    full_response.append(f"[Ảnh {idx+1} (OCR Mode)]: {resp_text}")
                else:
                    full_response.append(f"[Ảnh {idx+1}]: Không nhận diện được văn bản.")

            except Exception as e:
                full_response.append(f"[Lỗi xử lý ảnh {idx+1}]: {str(e)}")

        return {
            "success": True,
            "response": "\n\n".join(full_response),
            "mode": "gpu",
            "backend": "vintern-3b" if has_vintern else "ocr-fallback"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- BỔ SUNG CLASS NÀY (nếu chưa có) ---
class VisionChatRequest(BaseModel):
    text: str
    image_base64: str
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 256
    model_id: Optional[str] = None

# --- BỔ SUNG API NÀY VÀO CELL 6 ---
@app.post("/v1/vision-chat")
async def vision_chat_api(req: VisionChatRequest):
    """
    Wrapper endpoint: Nhận request 1 ảnh và chuyển tiếp sang logic xử lý đa ảnh (vision-multi)
    để tránh lỗi 404 từ phía client.
    """
    # Chuyển đổi format từ VisionChatRequest (1 ảnh) -> VisionMultiRequest (list ảnh)
    multi_req = VisionMultiRequest(
        text=req.text,
        images_base64=[req.image_base64], # Đóng gói ảnh đơn vào list
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        model_id=req.model_id
    )
    # Gọi trực tiếp hàm xử lý chính
    return await vision_multi_api(multi_req)

# ==============================
# 🔷 3. TTS STREAMING (gTTS)
# ==============================
@app.post("/v1/tts/stream")
async def tts_stream_api(req: TTSRequest):
    async def generate_audio_stream():
        temp_filename = f"/content/tts_{uuid.uuid4().hex}.mp3"
        try:
            tts = gTTS(text=req.text, lang=req.lang)
            tts.save(temp_filename)
            chunk_size = 32 * 1024
            with open(temp_filename, "rb") as f:
                while True:
                    data = f.read(chunk_size)
                    if not data: break
                    yield data
                    await asyncio.sleep(0.01)
            if os.path.exists(temp_filename): os.remove(temp_filename)
        except Exception as e:
            # In case of error, we can't easily return JSON in an audio stream.
            # We might yield nothing or a specific error header, but for now just log/pass
            print(f"TTS Error: {e}")

    return StreamingResponse(generate_audio_stream(), media_type="audio/mpeg")

# ==============================
# 🔶 4. STT STREAMING (Faster-Whisper)
# ==============================
@app.post("/v1/stt/stream")
async def stt_stream_api(file: UploadFile = File(...)):
    async def transcribe_stream():
        temp_filename = f"/content/upload_{uuid.uuid4().hex}.wav"
        try:
            with open(temp_filename, "wb") as f:
                f.write(await file.read())

            # Faster-whisper trả về generator
            segments, info = stt_model.transcribe(temp_filename, beam_size=5, language="vi")

            for segment in segments:
                payload = json.dumps({
                    "text": segment.text,
                    "start": segment.start,
                    "end": segment.end,
                    "partial": segment.text
                })
                yield payload + "\n"
                await asyncio.sleep(0.01)

            if os.path.exists(temp_filename): os.remove(temp_filename)
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(transcribe_stream(), media_type="application/x-ndjson")

# ==============================
# 🚀 STARTUP
# ==============================
@app.get("/gpu/metrics")
async def gpu_metrics():
    # Lấy thông số GPU thật
    try:
        r = subprocess.run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"], capture_output=True, text=True)
        u, m_used, m_total = r.stdout.strip().split(",")
        return {"gpu_utilization": float(u), "mem_used": float(m_used), "mem_total": float(m_total)}
    except:
        return {}

@app.get("/health")
async def health():
    try:
        ok_chat = chat_model is not None
        ok_tokenizer = chat_tokenizer is not None
        ok_vlm = vlm_model is not None and vlm_processor is not None
        ok_stt = stt_model is not None
        return {"status": "ok", "chat": ok_chat, "tokenizer": ok_tokenizer, "vlm": ok_vlm, "stt": ok_stt}
    except Exception:
        return {"status": "degraded"}

@app.get("/")
async def root():
    return {"status": "ok"}

print("--- KHỞI ĐỘNG SERVER (VRAM OPTIMIZED) ---")

def find_free_port() -> int:
    s = socket.socket()
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def is_port_available(p: int) -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('0.0.0.0', p))
        s.close()
        return True
    except OSError:
        return False

def run_uvicorn():
    import uvicorn
    import asyncio
    try:
        config = uvicorn.Config(app, host="0.0.0.0", port=PORT, loop="asyncio", lifespan="on")
        server = uvicorn.Server(config)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(server.serve())
    except Exception as e:
        print("UVicorn start error:", str(e))

if not is_port_available(PORT):
    new_port = find_free_port()
    print(f"⚠️ Port {PORT} đang được sử dụng, chuyển sang port {new_port}")
    PORT = new_port
else:
    print(f"✅ Sử dụng port {PORT}")

thread = threading.Thread(target=run_uvicorn, daemon=True)
thread.start()

time.sleep(1.0)

if USE_NGROK and NGROK_AUTH_TOKEN:
    try:
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        ngrok.kill()
        public_url = ngrok.connect(PORT)
        print(f"✅ Public URL: {public_url.public_url}")
        print(f"🔗 Health: {public_url.public_url}/health")
    except Exception as e:
        print(f"❌ Ngrok error: {e}")
else:
    print("⚠️ Chạy Localhost")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    pass
