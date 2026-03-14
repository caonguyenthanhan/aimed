import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os
import warnings
warnings.filterwarnings("ignore")

# Tên thư mục nơi bạn đã lưu adapter LoRA
adapter_dir = "model/lora_model_ViHealthQA"

# Sử dụng model GPT-2 nhỏ để test (không cần authorization)
model_name = "gpt2"

# Kiểm tra xem GPU có sẵn không
if torch.cuda.is_available():
    print("GPU đã sẵn sàng. Bắt đầu tải mô hình...")
    device = "cuda"
else:
    print("Không có GPU, sử dụng CPU. Quá trình sẽ chậm hơn...")
    device = "cpu"

# Tải mô hình gốc và tokenizer
try:
    print("Đang tải tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    print("Đang tải model...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        low_cpu_mem_usage=True
    )
    
    # Di chuyển model tới device
    if device == "cuda":
        model = model.to(device)
    
    # Thiết lập pad token nếu chưa có
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        
    print("Tải model thành công!")
    
    # Kiểm tra và tải adapter LoRA đã fine-tune (nếu có)
    if os.path.exists(adapter_dir):
        try:
            from peft import PeftModel
            print(f"Đang tải adapter LoRA từ {adapter_dir}...")
            model = PeftModel.from_pretrained(model, adapter_dir)
            print("Tải adapter LoRA thành công!")
        except Exception as e:
            print(f"Không thể tải adapter LoRA: {e}")
            print("Sử dụng model gốc...")
    else:
        print(f"Không tìm thấy adapter tại {adapter_dir}")
        print("Sử dụng model gốc...")
    
    # Chuyển model sang chế độ evaluation
    model.eval()
    
    # Hàm tạo prompt theo định dạng của ViHealthQA
    def create_prompt(question):
        return f"""Bạn là một bác sĩ chuyên nghiệp. Hãy trả lời câu hỏi y tế sau đây một cách chính xác và hữu ích.

Câu hỏi: {question}

Trả lời:"""
    
    print("\n=== Hệ thống tư vấn y tế ===\n")
    print("Nhập câu hỏi y tế của bạn (hoặc 'quit' để thoát):")
    
    while True:
        question = input("\nCâu hỏi: ").strip()
        
        if question.lower() in ['quit', 'exit', 'thoát']:
            print("Cảm ơn bạn đã sử dụng hệ thống!")
            break
        
        if not question:
            continue
        
        # Tạo prompt
        prompt = create_prompt(question)
        
        # Mã hóa câu hỏi và tạo câu trả lời
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_new_tokens=200,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Giải mã câu trả lời
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Lấy phần trả lời (sau "Trả lời:")
        if "Trả lời:" in response:
            answer = response.split("Trả lời:")[-1].strip()
        else:
            answer = response[len(prompt):].strip()
        
        print(f"\nTrả lời: {answer}")
        
except Exception as e:
    print(f"Lỗi khi tải model: {e}")
    print("Vui lòng kiểm tra lại cấu hình và thử lại.")