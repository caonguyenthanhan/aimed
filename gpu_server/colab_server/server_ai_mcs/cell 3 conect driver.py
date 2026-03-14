# @title 3. Kết nối Google Drive
# 1️⃣ Kết nối Google Drive
from google.colab import drive
drive.mount('/content/drive')

# 2️⃣ Khai báo đường dẫn thư mục
DB_ALL_PATH = "/content/drive/MyDrive/DoctorAI/data/DB_ALL"

# 3️⃣ Tạo thư mục (nếu chưa tồn tại)
import os
os.makedirs(DB_ALL_PATH, exist_ok=True)

# 4️⃣ Kiểm tra
print("Đã tạo / tồn tại:", os.path.exists(DB_ALL_PATH))
print("Danh sách thư mục cha:")
print(os.listdir(os.path.dirname(DB_ALL_PATH)))
