import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import os
import warnings
warnings.filterwarnings("ignore")

# Tên thư mục nơi bạn đã lưu adapter LoRA
# Dựa trên cấu trúc thư mục hiện tại
adapter_dir = "model/lora_model_ViHealthQA"

# Tên mô hình gốc (sử dụng model nhỏ hơn để test)
model_name = "microsoft/DialoGPT-medium"

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
        low_cpu_mem_usage=True,
        trust_remote_code=True
    )
    
    # Di chuyển model tới device
    if device == "cuda":
        model = model.to(device)
    
    # Thiết lập pad token nếu chưa có
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        
    print("Tải model thành công!")
        
except Exception as e:
    print(f"Lỗi khi tải model: {e}")
    model = None

if model:
    # Load adapter LoRA đã được fine-tune
    if os.path.exists(adapter_dir):
        print(f"Đang tải adapter LoRA từ: {adapter_dir}")
        model = PeftModel.from_pretrained(model, adapter_dir)
        print(f"Đã tải adapter LoRA thành công!")
    else:
        print(f"Không tìm thấy adapter tại: {adapter_dir}")
        print("Sử dụng model gốc chưa fine-tune.")
    
    # Chuyển model sang chế độ evaluation
    model.eval()

    # Định dạng câu hỏi cho mô hình
    def create_prompt(question):
        return f"""### Question:
{question}

### Answer:
"""

    # Vòng lặp hỏi đáp
    print("\nBắt đầu trò chuyện với mô hình. Gõ 'exit' để thoát.")
    while True:
        question = input("Bạn có câu hỏi nào về sức khỏe không? ")
        if question.lower() == 'exit':
            break

        prompt = create_prompt(question)

        # Mã hóa câu hỏi và tạo câu trả lời
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,
                use_cache=True,
                pad_token_id=tokenizer.eos_token_id,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7
            )

        # Giải mã câu trả lời và in ra màn hình
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Xử lý trường hợp mô hình trả lời theo định dạng khác nhau
        if '### Answer:' in generated_text:
            generated_answer = generated_text.split('### Answer:')[1].strip().replace('EOS', '')
        elif '### Output:' in generated_text:
            generated_answer = generated_text.split('### Output:')[1].strip().replace('EOS', '')
        else:
            generated_answer = generated_text.strip()

        print("\n[Mô hình trả lời]:")
        print(generated_answer)
        print("-" * 50)