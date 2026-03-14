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

@app.get("/")
async def root():
    return {"status": "ok", "service": "gpu", "version": "2.1.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

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
    temperature: Optional[float] = 0.5
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
                return "Error: pypdf library not found. Please install it."
        elif ext in ['docx', 'doc']:
            if docx:
                doc = docx.Document(file_stream)
                for para in doc.paragraphs:
                    text += para.text + "\n"
            else:
                return "Error: python-docx library not found. Please install it."
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
    print(f"📥 [Doc Chat Request] Doc: {req.doc_name} | Text len: {len(req.text)}")
    
    # 1. Kiểm tra đầu vào
    if not req.doc_base64 or not req.text:
        return VisionChatResponse(success=False, error="Thiếu dữ liệu: Yêu cầu 'doc_base64' và 'text'.")
        
    # 2. Trích xuất văn bản (OCR/PDF Parse)
    doc_text = _extract_text_from_doc(req.doc_base64, req.doc_name)
    if doc_text.startswith("Error:"):
        return VisionChatResponse(success=False, error=doc_text)

    # 3. Vệ sinh sơ bộ văn bản (Data Cleaning)
    # Loại bỏ các dòng quá ngắn hoặc nhiễu OCR không cần thiết để tránh AI bị phân tâm
    cleaned_text = "\n".join([line for line in doc_text.split('\n') if len(line.strip()) > 2])
        
    # 4. SYSTEM PROMPT: "Nhân cách" chuyên gia y tế nghiêm khắc
    # Đây là phần quan trọng nhất để sửa lỗi bịa bệnh
    system_instructions = (
        "Bạn là một Chuyên gia Phân tích Hồ sơ Y tế (Medical Record Analyst) uy tín và cẩn trọng.\n"
        "NHIỆM VỤ: Trả lời câu hỏi dựa trên dữ liệu văn bản được cung cấp.\n\n"
        "QUY TẮC AN TOÀN (BẮT BUỘC TUÂN THỦ):\n"
        "1. GROUNDING (CHỈ DỰA VÀO VĂN BẢN): Chỉ sử dụng thông tin hiển thị rõ ràng trong tài liệu. Tuyệt đối KHÔNG tự suy đoán hay thêm thắt thông tin bên ngoài.\n"
        "2. ANTI-HALLUCINATION (CHỐNG BỊA ĐẶT): Nếu văn bản ghi 'Phổi trong', 'Tim đều' => BẮT BUỘC kết luận là bình thường. Cấm bịa ra 'Viêm phổi' hay bệnh lý khác nếu không có bằng chứng chữ viết.\n"
        "3. TRUNG THỰC VỚI DỮ LIỆU THIẾU: Nếu tài liệu không chứa thông tin người dùng hỏi, hãy trả lời: 'Tài liệu được cung cấp không đề cập đến thông tin này'.\n"
        "4. CHÍNH XÁC CON SỐ: Trích xuất chính xác các chỉ số xét nghiệm, tuổi, ngày tháng.\n"
        "5. GIỌNG ĐIỆU: Chuyên nghiệp, khách quan, ngắn gọn, sử dụng thuật ngữ y khoa chính xác."
    )
    
    # 5. Tạo Context (Bối cảnh) rõ ràng
    full_prompt = (
        f"--- BẮT ĐẦU TÀI LIỆU Y TẾ ({req.doc_name}) ---\n"
        f"{cleaned_text}\n"
        f"--- KẾT THÚC TÀI LIỆU ---\n\n"
        f"YÊU CẦU CỦA NGƯỜI DÙNG: {req.text}"
    )
    
    # 6. Gửi yêu cầu đến Model
    try:
        chat_req = ChatRequest(
            model=req.model or "flash",
            messages=[
                ChatMessage(role="system", content=system_instructions),
                ChatMessage(role="user", content=full_prompt)
            ],
            # 🔥 QUAN TRỌNG: Giảm nhiệt độ xuống thấp để AI bớt "sáng tạo"
            # Mức 0.1 giúp AI chọn câu trả lời sát với văn bản nhất.
            temperature=0.5,  
            max_tokens=1024,
            mode="pro" # Ưu tiên chế độ xử lý kỹ nếu có
        )
        
        # Tái sử dụng logic chat_completions có sẵn
        response_dict = await chat_completions(chat_req)
        
        # Xử lý kết quả trả về (dict hoặc JSONResponse)
        content = ""
        if isinstance(response_dict, dict):
             content = response_dict.get("choices", [{}])[0].get("message", {}).get("content", "")
        else:
            import json
            body = json.loads(response_dict.body)
            if "error" in body:
                return VisionChatResponse(success=False, error=body["error"])
            content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
            
        return VisionChatResponse(success=True, response=content)
            
    except Exception as e:
        print(f"❌ Lỗi xử lý Document Chat: {e}")
        return VisionChatResponse(success=False, error=str(e))

# ==============================
# 🔷 1. CHAT API
# ==============================
@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest, x_mode: Optional[str] = Header(None)):
    print(f"📥 [Chat Request] Mode: {req.mode} | X-Mode: {x_mode} | Model: {req.model}")
    try:
        # Fix: Handle if x_mode is Header object (internal call default)
        if not isinstance(x_mode, str):
            x_mode = None

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
            print(f"🚫 [Refused] Non-medical question: {question}")
            return {
                "id": f"chatcmpl-{uuid.uuid4()}",
                "object": "chat.completion",
                "created": int(time.time()),
                "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
                "mode": mode
            }
        if mode == "pro":
            try:
                if 'retriever' in globals() and retriever is not None:
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
                    
                    # Update prompt with RAG context
                    rag_info = {"used": True, "retrieved": len(context_passages), "selected": top_k}
                else:
                    # Fallback to basic if retriever is missing
                    ctx = question
                    rag_info = {"used": False, "reason": "retriever_missing"}
            except Exception as e:
                print(f"RAG Error: {e}")
                ctx = question
                rag_info = {"used": False, "error": str(e)}

            doctor_prompt = "Bạn là bác sỹ tư vấn y tế, không kê đơn thuốc, không chẩn đoán thay thế chuyên môn. Trả lời tiếng Việt, ngắn gọn, rõ ràng, ưu tiên an toàn và khuyến cáo gặp bác sỹ khi cần."
            
            # Use ctx (either with RAG or just question)
            if rag_info.get("used"):
                 user_content = ctx
            else:
                 user_content = question

            input_text = chat_tokenizer.apply_chat_template(
                [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": user_content}],
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
            print(f"📤 [Response] Len: {len(response_text)} chars")
            del inputs, output
            torch.cuda.empty_cache()
            # rag_info updated safely above
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
        chat_req = ChatRequest(
            model=x_mode,
            messages=[ChatMessage(role="user", content=question)],
            temperature=0.5
        )
        res = await chat_completions(chat_req, x_mode=x_mode)
        if isinstance(res, dict):
             return {"reply": res.get("choices", [{}])[0].get("message", {}).get("content", "")}
        return {"reply": ""}
    except:
        return {"reply": ""}

@app.post("/v1/health-lookup")
async def health_lookup(req: HealthLookupRequest):
    # Endpoint tra cứu thuốc/bệnh (Added fix for 404 error)
    try:
        def classify_query(q: str):
            t = (q or "").strip().lower()
            drug_hints = ['thuốc', 'viên', 'mg', 'mcg', 'ml', '%', 'dạng', 'sirô', 'siro', 'kem', 'mỡ', 'ống', 'chai', 'hàm lượng', 'liều']
            disease_hints = ['bệnh', 'hội chứng', 'viêm', 'ung thư', 'tiểu đường', 'cao huyết áp', 'tim mạch', 'hen', 'suy', 'nhiễm', 'virus', 'vi khuẩn', 'vi rút']
            symptom_hints = ['triệu chứng', 'dấu hiệu', 'đau', 'nhức', 'sốt', 'ho', 'mệt', 'mệt mỏi', 'chóng mặt', 'buồn nôn', 'phát ban', 'khó thở', 'tiêu chảy', 'táo bón', 'đau đầu']
            import re
            is_drug = any(k in t for k in drug_hints) or bool(re.search(r"\b\d+\s?(mg|ml|mcg|%)\b", t))
            is_symptom = any(k in t for k in symptom_hints)
            is_disease = any(k in t for k in disease_hints)
            mode = 'drug' if is_drug else ('disease' if is_disease else ('symptom' if is_symptom else None))
            return {'mode': mode, 'is_medical': is_drug or is_symptom or is_disease}

        cls = classify_query(req.query)
        inferred_mode = (req.mode or cls.get('mode') or '').lower()
        
        # Thử tìm trong JSON nếu có (Optional)
        root = os.environ.get("DATA_ROOT", "/content/drive/MyDrive/DoctorAI/data")
        data_path = os.path.join(root, "data.json")
        drug_path = os.path.join(root, "thuoc.json")
        disease_match = None
        drug_match = None
        
        def norm(s): return (s or "").strip().lower()

        try:
            if os.path.exists(data_path):
                with open(data_path, "r", encoding="utf-8") as f:
                    db = json.load(f)
                if isinstance(db.get("diseases"), list):
                    for d in db["diseases"]:
                        if norm(d.get("name")) == norm(req.query) or (req.query and norm(req.query) in norm(d.get("name"))):
                            disease_match = d
                            break
            if os.path.exists(drug_path):
                 with open(drug_path, "r", encoding="utf-8") as f:
                    arr = json.load(f)
                 if isinstance(arr, list):
                    for item in arr:
                        if norm(item.get("name")) == norm(req.query) or (req.query and norm(req.query) in norm(item.get("name"))):
                            drug_match = {"name": item.get("name"), "content": item.get("content")}
                            break
        except Exception:
            pass

        if inferred_mode == "drug" and drug_match:
             text = f"Thuốc: {drug_match.get('name','')}\n" + (drug_match.get("content") or "")
             return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}
        if inferred_mode == "disease" and disease_match:
             d = disease_match
             text = f"Bệnh: {d.get('name','')}\n" + d.get("definition", "")
             return {"success": True, "response": text, "conversation_id": req.conversation_id, "mode": "gpu"}

        # AI Generation Fallback (Thay thế RAG nếu thiếu)
        doctor_prompt = (
            "Bạn là bác sĩ AI chuyên nghiệp. Hãy trả lời câu hỏi y tế của người dùng một cách chính xác, ngắn gọn. "
            "LƯU Ý: Luôn khuyến cáo người dùng đi khám bác sĩ. Không kê đơn thuốc cụ thể."
        )
        input_text = chat_tokenizer.apply_chat_template(
            [{"role": "system", "content": doctor_prompt}, {"role": "user", "content": req.query}],
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
        with torch.no_grad():
            output = chat_model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.3,
                do_sample=True,
                pad_token_id=chat_tokenizer.eos_token_id
            )
        response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        return {"success": True, "response": response_text, "conversation_id": req.conversation_id, "mode": "gpu"}

    except Exception as e:
        return {"success": False, "error": str(e), "mode": "gpu"}

@app.post("/v1/friend-chat/completions")
async def friend_chat_completions(req: ChatRequest, x_mode: Optional[str] = Header(None)):
    try:
        if not isinstance(x_mode, str):
            x_mode = None
        msgs = req.messages or []
        question = ""
        for m in reversed(msgs):
            if getattr(m, "role", "").lower() == "user":
                question = getattr(m, "content", "")
                break
        if not question and msgs:
            last = msgs[-1]
            question = getattr(last, "content", "")
        mode = (x_mode or req.mode or "pro").lower()
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
        use_lora = _ensure_friend_lora()
        if use_lora and friend_lora_model is not None and friend_lora_tokenizer is not None:
            text = friend_prompt + "\n\nNgười dùng: " + (question or "")
            inputs = friend_lora_tokenizer(text, return_tensors="pt").to(friend_lora_model.device)
            with torch.no_grad():
                output = friend_lora_model.generate(
                    **inputs,
                    max_new_tokens=req.max_tokens,
                    temperature=req.temperature,
                    do_sample=True if req.temperature and req.temperature > 0 else False
                )
            response_text = friend_lora_tokenizer.decode(output[0], skip_special_tokens=True)
        else:
            input_text = chat_tokenizer.apply_chat_template(
                [{"role": "system", "content": friend_prompt}, {"role": "user", "content": question}],
                tokenize=False,
                add_generation_prompt=True
            )
            inputs = chat_tokenizer(input_text, return_tensors="pt").to("cuda")
            with torch.no_grad():
                output = chat_model.generate(
                    **inputs,
                    max_new_tokens=req.max_tokens,
                    temperature=req.temperature,
                    do_sample=True if req.temperature and req.temperature > 0 else False,
                    pad_token_id=chat_tokenizer.eos_token_id
                )
            response_text = chat_tokenizer.decode(output[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
            del inputs, output
            torch.cuda.empty_cache()
        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(time.time()),
            "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
            "mode": mode
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ==============================
# 🚀 KHỞI CHẠY SERVER
# ==============================
import uvicorn

# Cấu hình cổng
PORT = 8000

# Mở ngrok tunnel
try:
    # Ngắt kết nối cũ nếu có
    ngrok.kill()
    
    # Kết nối mới
    public_url = ngrok.connect(PORT).public_url
    print(f"🚀 Public URL: {public_url}")
    print(f"👉 Hãy copy URL này vào file runtime-mode.json (trường 'ngrok_url')")
except Exception as e:
    print(f"⚠️ Không thể khởi tạo ngrok: {e}")

# Chạy Uvicorn
if __name__ == "__main__":
    import logging
    import sys
    import uvicorn
    import asyncio

    # Cấu hình logging ép buộc xuất ra stdout
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True
    )

    # Fix cho Colab & Local: Tự động phát hiện loop
    # Bật log_level="info" và access_log=True để coder thấy request
    config = uvicorn.Config(app, host="0.0.0.0", port=PORT, log_level="info", access_log=True)
    server = uvicorn.Server(config)
    
    # Ép buộc logger của server sử dụng cấu hình chung
    server_logger = logging.getLogger("uvicorn.error")
    server_logger.handlers = [logging.StreamHandler(sys.stdout)]
    server_logger.setLevel(logging.INFO)
    
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers = [logging.StreamHandler(sys.stdout)]
    access_logger.setLevel(logging.INFO)

    # Logic khởi chạy server thông minh (Support Colab/Jupyter & Local)
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            print("🚀 Detected running event loop (Colab/Jupyter).", flush=True)
            try:
                import nest_asyncio
                nest_asyncio.apply()
                print("✅ Applied nest_asyncio.", flush=True)
                # Blocking call to keep cell alive
                loop.run_until_complete(server.serve())
            except ImportError:
                print("⚠️ 'nest_asyncio' missing. Installing...", flush=True)
                import os
                os.system("pip install nest_asyncio")
                import nest_asyncio
                nest_asyncio.apply()
                loop.run_until_complete(server.serve())
            except Exception as e:
                print(f"⚠️ Failed to run with nest_asyncio: {e}", flush=True)
                print("👉 Falling back to create_task (Non-blocking mode)...", flush=True)
                loop.create_task(server.serve())
        else:
            print("🚀 Starting new event loop (Standard Python)...", flush=True)
            asyncio.run(server.serve())
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user (KeyboardInterrupt).", flush=True)
