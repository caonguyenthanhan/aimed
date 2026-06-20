# Hướng dẫn sử dụng Inference Scripts

## Tổng quan

Dự án này bao gồm 3 file test inference để kiểm tra model AI y tế đã được fine-tune:

1. **`test.py`** - Script chính sử dụng transformers và PEFT
2. **`test_simple.py`** - Version đơn giản với model nhỏ hơn
3. **`test_offline.py`** - Mock version để test cấu trúc code

## Cấu trúc Model

### Fine-tuned Model
- **Base Model**: Llama 3.1 8B
- **Fine-tuning Method**: LoRA (Low-Rank Adaptation)
- **Dataset**: ViHealthQA (Vietnamese Health Q&A)
- **Adapter Location**: `model/lora_model_ViHealthQA/`

### Files trong adapter:
```
model/lora_model_ViHealthQA/
├── adapter_config.json
├── adapter_model.safetensors
├── special_tokens_map.json
├── tokenizer.json
└── tokenizer_config.json
```

## Cách sử dụng

### 1. test_offline.py (Khuyến nghị để test)

```bash
python test_offline.py
```

**Ưu điểm:**
- Không cần kết nối internet
- Không cần Hugging Face token
- Test được cấu trúc code hoàn chỉnh
- Chạy nhanh và ổn định

**Chức năng:**
- Mock tokenizer và model
- Test tự động với 2 câu hỏi mẫu
- Chế độ tương tác để nhập câu hỏi
- Kiểm tra load adapter LoRA

### 2. test.py (Production script)

```bash
python test.py
```

**Yêu cầu:**
- Hugging Face token hợp lệ
- Model có quyền truy cập
- GPU (khuyến nghị) hoặc CPU

**Cách setup Hugging Face token:**
```bash
# Cài đặt huggingface-hub
pip install huggingface-hub

# Login với token
hf auth login
```

### 3. test_simple.py (Fallback option)

```bash
python test_simple.py
```

**Đặc điểm:**
- Sử dụng model nhỏ hơn (GPT-2)
- Vẫn cần Hugging Face token
- Phù hợp cho máy có cấu hình thấp

## Troubleshooting

### Lỗi Authentication (401 Unauthorized)

**Nguyên nhân:** Không có hoặc token Hugging Face không hợp lệ

**Giải pháp:**
1. Tạo token tại: https://huggingface.co/settings/tokens
2. Login: `hf auth login`
3. Hoặc sử dụng `test_offline.py`

### Lỗi GPU/CUDA

**Nguyên nhân:** Không có GPU hoặc CUDA không tương thích

**Giải pháp:**
- Script tự động fallback về CPU
- Quá trình sẽ chậm hơn nhưng vẫn hoạt động

### Lỗi Dependencies

**Cài đặt packages cần thiết:**
```bash
pip install torch transformers peft accelerate
```

### Lỗi Triton/TorchAO

**Giải pháp:**
```bash
pip uninstall torchao triton -y
```

## Cấu trúc Code

### Prompt Template
```python
def create_prompt(question):
    return f"""Bạn là một bác sĩ chuyên nghiệp. Hãy trả lời câu hỏi y tế sau đây một cách chính xác và hữu ích.

Câu hỏi: {question}

Trả lời:"""
```

### Generation Parameters
```python
outputs = model.generate(
    inputs.input_ids,
    max_new_tokens=200,
    temperature=0.7,
    do_sample=True,
    pad_token_id=tokenizer.eos_token_id
)
```

## Kết quả mong đợi

### Với adapter LoRA:
- Model sẽ trả lời theo phong cách y tế chuyên nghiệp
- Câu trả lời phù hợp với ngữ cảnh Việt Nam
- Chất lượng cao hơn so với model gốc

### Không có adapter:
- Sử dụng model gốc
- Vẫn có thể trả lời nhưng chất lượng thấp hơn

## Lưu ý quan trọng

1. **Chỉ mang tính chất tham khảo**: Kết quả từ AI không thay thế ý kiến bác sĩ
2. **Test thoroughly**: Luôn kiểm tra kỹ trước khi deploy production
3. **Resource usage**: Model lớn cần nhiều RAM và thời gian xử lý
4. **Privacy**: Không nhập thông tin y tế nhạy cảm khi test

## Tích hợp vào Web App

Để tích hợp vào Next.js app:
1. Tạo API endpoint trong `app/api/`
2. Load model khi khởi động server
3. Xử lý requests qua API calls
4. Implement caching để tối ưu performance

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs chi tiết
2. Thử `test_offline.py` trước
3. Xác nhận dependencies đã cài đặt đúng
4. Kiểm tra network connection cho Hugging Face