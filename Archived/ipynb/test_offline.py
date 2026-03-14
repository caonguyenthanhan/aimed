import torch
import os
import warnings
warnings.filterwarnings("ignore")

# Mock classes để test cấu trúc code mà không cần tải model thật
class MockTokenizer:
    def __init__(self):
        self.eos_token = "<|endoftext|>"
        self.pad_token = self.eos_token
    
    def __call__(self, text, return_tensors=None):
        # Giả lập tokenization
        tokens = text.split()[:50]  # Giới hạn 50 tokens
        input_ids = torch.randint(1, 1000, (1, len(tokens)))
        return MockInputs(input_ids)
    
    def decode(self, tokens, skip_special_tokens=False):
        # Giả lập decoding
        return "Đây là câu trả lời mẫu từ hệ thống AI y tế. Vui lòng tham khảo ý kiến bác sĩ chuyên khoa để có chẩn đoán chính xác."

class MockInputs:
    def __init__(self, input_ids):
        self.input_ids = input_ids
    
    def to(self, device):
        return self

class MockModel:
    def __init__(self):
        self.device = "cpu"
    
    def to(self, device):
        self.device = device
        return self
    
    def eval(self):
        return self
    
    def generate(self, input_ids, max_new_tokens=200, temperature=0.7, do_sample=True, pad_token_id=None):
        # Giả lập generation
        batch_size, seq_len = input_ids.shape
        new_tokens = torch.randint(1, 1000, (batch_size, max_new_tokens))
        return torch.cat([input_ids, new_tokens], dim=1)

class MockPeftModel:
    @staticmethod
    def from_pretrained(model, adapter_dir):
        print(f"Mock: Đã tải adapter từ {adapter_dir}")
        return model

# Tên thư mục nơi bạn đã lưu adapter LoRA
adapter_dir = "model/lora_model_ViHealthQA"

print("=== CHẠY Ở CHẾ ĐỘ TEST OFFLINE ===")
print("Đây là version test để kiểm tra cấu trúc code mà không cần tải model thật.\n")

# Kiểm tra xem GPU có sẵn không
if torch.cuda.is_available():
    print("GPU đã sẵn sàng. Bắt đầu tải mô hình...")
    device = "cuda"
else:
    print("Không có GPU, sử dụng CPU. Quá trình sẽ chậm hơn...")
    device = "cpu"

# Tải mô hình gốc và tokenizer (mock)
try:
    print("Đang tải tokenizer...")
    tokenizer = MockTokenizer()
    
    print("Đang tải model...")
    model = MockModel()
    
    # Di chuyển model tới device
    if device == "cuda":
        model = model.to(device)
    
    print("Tải model thành công!")
    
    # Kiểm tra và tải adapter LoRA đã fine-tune (nếu có)
    if os.path.exists(adapter_dir):
        try:
            print(f"Đang tải adapter LoRA từ {adapter_dir}...")
            model = MockPeftModel.from_pretrained(model, adapter_dir)
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
    
    print("\n=== Hệ thống tư vấn y tế (MOCK MODE) ===\n")
    print("Nhập câu hỏi y tế của bạn (hoặc 'quit' để thoát):")
    print("Lưu ý: Đây là chế độ test, câu trả lời chỉ mang tính chất minh họa.\n")
    
    # Test với một câu hỏi mẫu
    test_questions = [
        "Triệu chứng của bệnh cảm cúm là gì?",
        "Làm thế nào để phòng ngừa bệnh tim mạch?"
    ]
    
    print("=== TEST TỰ ĐỘNG ===")
    for i, question in enumerate(test_questions, 1):
        print(f"\nTest {i}: {question}")
        
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
                pad_token_id=tokenizer.eos_token
            )
        
        # Giải mã câu trả lời
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"Trả lời: {response}")
    
    print("\n=== CHẾ ĐỘ TƯƠNG TÁC ===")
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
                pad_token_id=tokenizer.eos_token
            )
        
        # Giải mã câu trả lời
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"\nTrả lời: {response}")
        
except Exception as e:
    print(f"Lỗi khi chạy test: {e}")
    print("Vui lòng kiểm tra lại cấu hình và thử lại.")