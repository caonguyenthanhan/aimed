# @title 2. Khởi tạo Model (Whisper chạy CPU để cứu GPU)
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoProcessor, LlavaNextForConditionalGeneration, BitsAndBytesConfig
from faster_whisper import WhisperModel
import os
import gc
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

# 1. Dọn dẹp sạch sẽ bộ nhớ trước khi load
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    torch.cuda.ipc_collect()
gc.collect()

# --- CẤU HÌNH ---
CHAT_MODEL_ID = "unsloth/Llama-3.2-3B-Instruct"
VLM_MODEL_ID = "llava-hf/llava-1.5-7b-hf"

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"▶ Đang chạy trên thiết bị chính: {device.upper()}")

# Cấu hình 4-bit (Chìa khóa để chạy trên T4)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16
)

# ------------------------------------------------------------------
# A. Load Chat Model (Llama 3.2 3B - 4bit) -> GPU
# ------------------------------------------------------------------
print("⏳ [1/3] Loading Chat Model (GPU 4-bit)...")
if 'chat_tokenizer' in globals() and chat_tokenizer is not None and 'chat_model' in globals() and chat_model is not None:
    print("   ✔ Chat Model already loaded.")
else:
    chat_tokenizer = AutoTokenizer.from_pretrained(CHAT_MODEL_ID)
    try:
        chat_model = AutoModelForCausalLM.from_pretrained(
            CHAT_MODEL_ID,
            quantization_config=bnb_config,
            device_map="auto"
        )
        print("   ✔ Chat Model OK.")
    except Exception:
        chat_model = AutoModelForCausalLM.from_pretrained(
            CHAT_MODEL_ID,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        print("   ✔ Chat Model OK (fp16 fallback).")

# ------------------------------------------------------------------
# B. Load Vision Model (Llava 7B - 4bit) -> GPU
# ------------------------------------------------------------------
print("⏳ [2/3] Loading Vision Model (GPU 4-bit)...")
from transformers import LlavaForConditionalGeneration
if 'vlm_processor' in globals() and vlm_processor is not None and 'vlm_model' in globals() and vlm_model is not None:
    print("   ✔ Vision Model already loaded.")
else:
    vlm_processor = AutoProcessor.from_pretrained(VLM_MODEL_ID)
    try:
        vlm_model = LlavaForConditionalGeneration.from_pretrained(
            VLM_MODEL_ID,
            quantization_config=bnb_config,
            device_map="auto"
        )
        print("   ✔ Vision Model OK.")
    except Exception:
        vlm_model = LlavaForConditionalGeneration.from_pretrained(
            VLM_MODEL_ID,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        print("   ✔ Vision Model OK (fp16 fallback).")

# ------------------------------------------------------------------
# C. Load Whisper (Faster-Whisper) -> CPU (ĐỂ TRÁNH OOM)
# ------------------------------------------------------------------
print("⏳ [3/3] Loading Faster-Whisper (CPU Int8)...")
if 'stt_model' in globals() and stt_model is not None:
    print("   ✔ Whisper Model already loaded.")
else:
    stt_model = WhisperModel("medium", device="cpu", compute_type="int8")
    print("   ✔ Whisper Model OK.")

# ------------------------------------------------------------------
print("\n📊 Trạng thái VRAM sau khi load:")
print(torch.cuda.memory_summary(abbreviated=True))
print("🚀 TẤT CẢ MODEL ĐÃ SẴN SÀNG (Llama+Llava on GPU, Whisper on CPU)!")
