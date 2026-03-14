"""
OCR Processing Functions
Extracted and adapted from the research notebook
"""

import torch
import gc
from pathlib import Path
from typing import List, Union
from PIL import Image
import torchvision.transforms as T
from torchvision.transforms.functional import InterpolationMode

def clean_gpu_resources(*vars_to_delete):
    """Clean GPU resources and free memory"""
    for var in vars_to_delete:
        if var is not None:
            del var
    
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

def build_transform(input_size):
    """Build image transformation pipeline"""
    IMAGENET_MEAN = (0.485, 0.456, 0.406)
    IMAGENET_STD = (0.229, 0.224, 0.225)
    
    transform = T.Compose([
        T.Lambda(lambda img: img.convert('RGB') if img.mode != 'RGB' else img),
        T.Resize((input_size, input_size), interpolation=InterpolationMode.BICUBIC),
        T.ToTensor(),
        T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])
    return transform

def find_closest_aspect_ratio(aspect_ratio, target_ratios, width, height, image_size):
    """Find the closest aspect ratio from target ratios"""
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

def dynamic_preprocess(image, min_num=1, max_num=12, image_size=448, use_thumbnail=False):
    """Dynamic preprocessing for images"""
    orig_width, orig_height = image.size
    aspect_ratio = orig_width / orig_height

    # Calculate target ratios
    target_ratios = set(
        (i, j) for n in range(min_num, max_num + 1) for i in range(1, n + 1) for j in range(1, n + 1) if
        i * j <= max_num and i * j >= min_num)
    target_ratios = sorted(target_ratios, key=lambda x: x[0] * x[1])

    # Find the closest aspect ratio
    target_aspect_ratio = find_closest_aspect_ratio(
        aspect_ratio, target_ratios, orig_width, orig_height, image_size)

    # Calculate the target width and height
    target_width = image_size * target_aspect_ratio[0]
    target_height = image_size * target_aspect_ratio[1]
    blocks = target_aspect_ratio[0] * target_aspect_ratio[1]

    # Resize the image
    resized_img = image.resize((target_width, target_height))
    processed_images = []
    for i in range(blocks):
        box = (
            (i % (target_width // image_size)) * image_size,
            (i // (target_width // image_size)) * image_size,
            ((i % (target_width // image_size)) + 1) * image_size,
            ((i // (target_width // image_size)) + 1) * image_size
        )
        # split the image
        split_img = resized_img.crop(box)
        processed_images.append(split_img)
    assert len(processed_images) == blocks
    if use_thumbnail and len(processed_images) != 1:
        thumbnail_img = image.resize((image_size, image_size))
        processed_images.append(thumbnail_img)
    return processed_images

def load_image(image_file, input_size=448, max_num=12):
    """Load and preprocess image for model input"""
    if isinstance(image_file, (str, Path)):
        image = Image.open(image_file).convert('RGB')
    else:
        image = image_file
    
    transform = build_transform(input_size=input_size)
    images = dynamic_preprocess(image, image_size=input_size, use_thumbnail=True, max_num=max_num)
    pixel_values = [transform(image) for image in images]
    pixel_values = torch.stack(pixel_values)
    return pixel_values

def filter_and_clean_response(raw_text: str) -> str:
    """Filter and clean the model response"""
    if not raw_text:
        return ""
    
    # Remove common unwanted patterns
    unwanted_patterns = [
        "Dựa trên hình ảnh được cung cấp",
        "Từ hình ảnh",
        "Theo thông tin trong ảnh",
        "Dựa vào ảnh",
        "Từ ảnh được cung cấp"
    ]
    
    cleaned_text = raw_text.strip()
    
    # Remove unwanted patterns
    for pattern in unwanted_patterns:
        if pattern in cleaned_text:
            # Find the pattern and remove everything before it and the pattern itself
            index = cleaned_text.find(pattern)
            if index != -1:
                # Find the end of the sentence containing the pattern
                end_index = cleaned_text.find('\n', index)
                if end_index == -1:
                    end_index = cleaned_text.find('.', index)
                    if end_index != -1:
                        end_index += 1
                if end_index != -1:
                    cleaned_text = cleaned_text[end_index:].strip()
                else:
                    cleaned_text = cleaned_text[index + len(pattern):].strip()
    
    return cleaned_text

def synthesize_with_vintern(raw_text: str, prompt_template: str, model, tokenizer) -> str:
    """Synthesize information using the model"""
    pixel_values = None
    response = None
    
    try:
        # Format the prompt with the raw text
        formatted_prompt = prompt_template.format(raw_text=raw_text)
        
        # Generation configuration
        generation_config = {
            'max_new_tokens': 1024,
            'do_sample': False,
            'pad_token_id': tokenizer.eos_token_id,
            'eos_token_id': tokenizer.eos_token_id
        }
        
        # Generate response
        response, _ = model.chat(
            tokenizer,
            None,  # No image for synthesis
            formatted_prompt,
            generation_config=generation_config,
            history=None,
            return_history=True
        )
        
        return filter_and_clean_response(response)
        
    except Exception as e:
        return f"Lỗi trong quá trình tổng hợp: {e}"
    finally:
        clean_gpu_resources(pixel_values, response)

def summary_gpkd_info(combined_text, model, tokenizer):
    """Summarize business license information"""
    prompt_template = """<|im_start|>user
Bạn là một trợ lý AI, nhiệm vụ của bạn là tổng hợp thông tin từ các khối văn bản về Giấy phép kinh doanh vào một mẫu duy nhất.

**Văn bản cần xử lý:**
---
{raw_text}
---

**Mẫu cần điền:**
- Tên doanh nghiệp:
- Mã số thuế:
- Loại hình doanh nghiệp:
- Ngày cấp GPKD:
- Địa chỉ:
- Họ tên người đại diện:
- Số giấy tờ pháp lý của cá nhân:
- Ngày cấp:
- Địa chỉ thường trú:
** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
"""
    return synthesize_with_vintern(combined_text, prompt_template, model, tokenizer)

def summary_cccd_info(combined_text, model, tokenizer):
    """Summarize CCCD information"""
    prompt_template = """<|im_start|>user
Bạn là một trợ lý AI, nhiệm vụ của bạn là tổng hợp thông tin từ hai khối văn bản (mặt trước và mặt sau của CCCD) vào một mẫu duy nhất.

**Văn bản cần xử lý:**
---
{raw_text}
---

**Mẫu cần điền (hợp nhất từ cả 2 mặt):**
- Số CCCD:
- Họ và tên:
- Ngày sinh:
- Giới tính:
- Quốc tịch:
- Quê quán:
- Nơi thường trú:
- Đặc điểm nhận dạng:
- Ngày cấp:
- Nơi cấp:
** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
"""
    return synthesize_with_vintern(combined_text, prompt_template, model, tokenizer)

def summary_ocop_info(combined_text, model, tokenizer):
    """Summarize OCOP information"""
    prompt_template = """<|im_start|>user
Bạn là một trợ lý AI thông minh, nhiệm vụ của bạn là tổng hợp thông tin từ các khối văn bản về chứng nhận OCOP vào một mẫu duy nhất.

**Văn bản cần xử lý:**
---
{raw_text}
---

**Mẫu cần điền:**
- Tên sản phẩm:
- Chủ thể (Tên công ty/hợp tác xã/hộ kinh doanh):
- Địa chỉ của chủ thể:
- Hạng sao: (Ví dụ: 3 sao, 4 sao, 5 sao)
- Quyết định công nhận số:
- Ngày cấp chứng nhận:
- Có giá trị đến ngày:
- Cơ quan cấp: (UBND tỉnh/thành phố nào)
** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
"""
    return synthesize_with_vintern(combined_text, prompt_template, model, tokenizer)

def extract_cccd_one_side(image_paths: List[Path], force_side: str, model, tokenizer, device):
    """Extract information from one side of CCCD"""
    # Validation
    if len(image_paths) != 1:
        return f"Lỗi: (extract_cccd_one_side) Hàm này chỉ chấp nhận 1 ảnh. Bạn đã cung cấp {len(image_paths)} ảnh."

    if force_side not in ["front", "back"]:
        return f"Lỗi: (extract_cccd_one_side) Tham số 'force_side' không hợp lệ. Phải là 'front' hoặc 'back'."

    image_path = image_paths[0]
    side = force_side

    # Generation configuration
    config_extract = {
        'max_new_tokens': 1024,
        'do_sample': False,
        'pad_token_id': tokenizer.eos_token_id,
        'eos_token_id': tokenizer.eos_token_id
    }

    # Choose prompt based on side
    if side == "front":
        question = """<image>\nTrích xuất chính xác các thông tin sau từ mặt TRƯỚC CCCD, hãy trích xuất chính xác
        các trường thông tin sau và liệt kê chúng một cách rõ ràng, phân tách thông tin
        của mỗi CCCD bằng một dòng "---":
        - Số:
        - Họ và tên:
        - Ngày sinh:
        - Giới tính:
        - Quốc tịch:
        - Quê quán:
        - Nơi thường trú:
        - Có giá trị đến (Date of expiry):
        ** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
        """
    else:  # side == "back"
        question = """<image>\nTrích xuất chính xác các thông tin sau từ mặt SAU CCCD, hãy trích xuất chính xác
        các trường thông tin sau và liệt kê chúng một cách rõ ràng, phân tách thông tin
        của mỗi CCCD bằng một dòng "---":
        - Đặc điểm nhận dạng: (thường ở góc trên bên trái)
        - Ngày cấp: (là ngày dưới đặc điểm nhận dạng)
        - Nơi cấp: (là vị trí công tác của người ký tên cấp giấy)
        ** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
        """

    print(f"...Đang trích xuất mặt {side} của ảnh '{image_path.name}'...")
    
    # Initialize variables
    pixel_values = None
    response = None
    
    try:
        pixel_values = load_image(image_path, max_num=12).to(torch.bfloat16).to(device)
        response, _ = model.chat(
            tokenizer,
            pixel_values,
            question,
            generation_config=config_extract,
            history=None,
            return_history=True
        )
        final_result_text = filter_and_clean_response(response)
        print(f"✅ Trích xuất mặt {side} thành công.")
        return final_result_text
        
    except Exception as e:
        return f"Lỗi trong quá trình trích xuất mặt {side}: {e}"
    finally:
        clean_gpu_resources(pixel_values, response)

def extract_cccd_info(image_paths_with_side: List, model, tokenizer, device):
    """Extract CCCD information from multiple images"""
    num_images = len(image_paths_with_side)
    
    if num_images == 0:
        return "Không có ảnh nào được cung cấp."
    
    extracted_data = []
    
    # Process each image
    for side, image_path in image_paths_with_side:
        if side not in ["front", "back"]:
            extracted_data.append(f"Lỗi: Loại '{side}' không hợp lệ cho ảnh {image_path.name}")
            continue
        
        result = extract_cccd_one_side([image_path], side, model, tokenizer, device)
        extracted_data.append(result)
    
    # Combine results if multiple images
    if len(extracted_data) > 1:
        print("\nNhiều hơn 1 ảnh được tìm thấy, bắt đầu tổng hợp thông tin...")
        combined_text = "\n---\n".join(extracted_data)
        final_result = summary_cccd_info(combined_text, model, tokenizer)
        print("\n✅ KẾT QUẢ TỔNG HỢP CUỐI CÙNG:")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    elif len(extracted_data) == 1:
        final_result = extracted_data[0]
        print("\n✅ KẾT QUẢ TRÍCH XUẤT (1 ẢNH):")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    else:
        return "Không có dữ liệu nào được trích xuất."

def extract_ocop_info(image_paths: List[Path], model, tokenizer):
    """Extract OCOP certificate information"""
    extracted_data = []
    generation_config_extract = {
        'max_new_tokens': 1024,
        'do_sample': False,
        'num_beams': 3,
        'repetition_penalty': 2.5,
        'pad_token_id': tokenizer.eos_token_id,
        'eos_token_id': tokenizer.eos_token_id
    }
    
    question = """<image>\nBạn là một hệ thống OCR chuyên nghiệp. Hãy phân tích các hình ảnh được cung cấp,
        đây là các Giấy chứng nhận sản phẩm OCOP của Việt Nam. Với mỗi ảnh,
        hãy trích xuất chính xác các trường thông tin sau và liệt kê chúng một cách rõ ràng,
        phân tách thông tin của mỗi chứng nhận bằng một dòng \"---\":
        - Tên sản phẩm:
        - Chủ thể: (Tên công ty/hợp tác xã/hộ kinh doanh)
        - Địa chỉ của chủ thể:
        - Hạng sao: (Ví dụ: 3 sao, 4 sao, 5 sao, trong ảnh sẽ có câu đạt .. sao...)
        - Quyết định công nhận số: (thường nằm góc dưới bên trái)
        - Ngày cấp chứng nhận: (là ngày ký trên chứng nhận)
        - Cơ quan cấp: (UBND tỉnh/thành phố nào, được ghi ở phía trên của chứng nhận sau quốc hiệu và quốc ngữ)
        ** kết thúc mẫu**
lưu ý: Nếu một trường thông tin không thể tìm thấy, hãy để trống.<|im_end|>
<|im_start|>assistant
        """

    print(f"Bắt đầu trích xuất thông tin từ {len(image_paths)} ảnh OCOP...")

    for image_path in image_paths:
        pixel_values = None
        response = None
        
        try:
            pixel_values = load_image(image_path, max_num=12).to(torch.bfloat16).to(model.device)
            response, _ = model.chat(
                tokenizer,
                pixel_values,
                question,
                generation_config=generation_config_extract,
                history=None,
                return_history=True
            )
            cleaned_response = filter_and_clean_response(response)
            extracted_data.append(cleaned_response)
            print(f"Đã xử lý xong: {image_path.name}")
        except Exception as e:
            error_message = f"Lỗi khi xử lý {image_path.name}: {e}"
            print(error_message)
            extracted_data.append(error_message)
        finally:
            clean_gpu_resources(pixel_values, response)

    # Process results
    if len(extracted_data) > 1:
        print("\nNhiều hơn 1 ảnh được tìm thấy, bắt đầu tổng hợp thông tin...")
        combined_text = "\n---\n".join(extracted_data)
        final_result = summary_ocop_info(combined_text, model, tokenizer)
        print("\n✅ KẾT QUẢ TỔNG HỢP CUỐI CÙNG:")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    elif len(extracted_data) == 1:
        final_result = extracted_data[0]
        print("\n✅ KẾT QUẢ TRÍCH XUẤT (1 ẢNH):")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    else:
        return "Không có dữ liệu nào được trích xuất."

def extract_business_license_info(image_paths: List[Path], model, tokenizer):
    """Extract business license information"""
    extracted_data = []
    generation_config_extract = {
        'max_new_tokens': 1024,
        'do_sample': False,
        'num_beams': 3,
        'repetition_penalty': 2.5,
        'pad_token_id': tokenizer.eos_token_id,
        'eos_token_id': tokenizer.eos_token_id
    }
    
    question = """<image>\n
Bạn là một hệ thống OCR chuyên nghiệp. Hãy phân tích các hình ảnh được cung cấp,
đây là các Giấy chứng nhận đăng ký doanh nghiệp của Việt Nam. Với mỗi ảnh,
hãy trích xuất chính xác các trường thông tin sau và liệt kê chúng một cách rõ ràng:
- Tên doanh nghiệp:
- Mã số thuế:
- Loại hình doanh nghiệp:
- Ngày cấp GPKD:  (Ngày thành lập)
- Địa chỉ:
- Họ tên người đại diện:
- Số giấy tờ pháp lý của cá nhân: (của người đại diện)
- Ngày cấp: (của người đại diện)
- Địa chỉ thường trú:  (của người đại diện)
"""

    print(f"Bắt đầu trích xuất thông tin từ {len(image_paths)} ảnh GPKD...")

    for image_path in image_paths:
        pixel_values = None
        response = None
        
        try:
            pixel_values = load_image(image_path, max_num=12).to(torch.bfloat16).to(model.device)
            response, _ = model.chat(
                tokenizer, 
                pixel_values, 
                question, 
                generation_config=generation_config_extract, 
                history=None, 
                return_history=True
            )
            cleaned_response = filter_and_clean_response(response)
            extracted_data.append(cleaned_response)
            print(f"Đã xử lý xong: {image_path.name}")
        except Exception as e:
            error_message = f"Lỗi khi xử lý {image_path.name}: {e}"
            print(error_message)
            extracted_data.append(error_message)
        finally:
            clean_gpu_resources(pixel_values, response)

    # Process results
    if len(extracted_data) > 1:
        print("\nNhiều hơn 1 ảnh được tìm thấy, bắt đầu tổng hợp thông tin...")
        combined_text = "\n---\n".join(extracted_data)
        final_result = summary_gpkd_info(combined_text, model, tokenizer)
        print("\n✅ KẾT QUẢ TỔNG HỢP CUỐI CÙNG:")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    elif len(extracted_data) == 1:
        final_result = extracted_data[0]
        print("\n✅ KẾT QUẢ TRÍCH XUẤT (1 ẢNH):")
        print("===============================================")
        print(final_result)
        print("===============================================")
        return final_result
    else:
        return "Không có dữ liệu nào được trích xuất."