# chạy với môi trường C:/Users/ACER/AppData/Local/Programs/Python/Python311/python.exe
from gtts import gTTS
import datetime
import os

def text_to_speech(input_file, output_dir, lang='vi'):
    # Đọc nội dung từ tập tin văn bản
    with open(input_file, 'r', encoding='utf-8') as file:
        text = file.read()

    # Chuyển đổi văn bản thành âm thanh
    tts = gTTS(text, lang=lang)

    # Lấy thời gian hiện tại để tạo tên tệp duy nhất
    now = datetime.datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    output_file = f"output_{timestamp}.mp3"

    # Tạo đường dẫn đầy đủ cho tệp đầu ra
    output_path = os.path.join(output_dir, output_file)

    # Lưu âm thanh thành file mp3 mới
    tts.save(output_path)
    print(f"Đã chuyển đổi và lưu thành công vào '{output_path}'")

# Gọi hàm để chuyển đổi và lưu âm thanh
# input_file = r'C:\Users\ACER\Desktop\tet\1input.txt'
input_file = os.path.join(os.path.dirname(__file__), '1input.txt')
# output_dir = r'C:\Users\ACER\Desktop\tet'  # Thư mục lưu trữ
output_dir = os.path.dirname(__file__)  # Lưu trữ trong cùng thư mục với code
text_to_speech(input_file, output_dir)
