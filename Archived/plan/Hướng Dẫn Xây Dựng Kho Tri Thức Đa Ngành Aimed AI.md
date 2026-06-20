# **📘 HƯỚNG DẪN XÂY DỰNG KHO TRI THỨC Y TẾ & TÂM LÝ (DUAL-KNOWLEDGE BASE)**

**Dành cho:** Thành viên phụ trách Y tế & Thành viên phụ trách Tâm lý.

**Mục tiêu:** Tạo ra một "Hệ sinh thái tri thức" chuẩn xác để cung cấp cho các Agent chuyên biệt.

## **0\. THAM CHIẾU BẢN THIẾT KẾ CHUNG (SSOT)**

* Schema DB + mapping ingest \-\> đồ thị: `plan/Chi Tiết Schema Y Khoa & Đồ Thị Tri thức.md`
* Category bắt buộc có **EXERCISE** (bài tập) tách với **THERAPY** (khung liệu pháp).
* MedicalRelations có **Evidence/Note** \-\> lưu vào trường ghi chú (không làm mất thông tin).

## **1\. PHÂN CHIA TRÁCH NHIỆM (WORKSTREAM)**

Hệ thống của chúng ta hoạt động dựa trên sự giao thoa. Dù làm mảng nào, bạn cũng phải tuân thủ cấu trúc 3 tệp dữ liệu chung.

### **🏥 Nhánh 1: Tư vấn Y tế (Medical Data)**

* **Thực thể:** Tên các bệnh lý tâm thần/thực thể, các loại thuốc hỗ trợ, các triệu chứng sinh lý.  
* **Mối quan hệ:** Bệnh lý \-\> Triệu chứng; Bệnh lý \-\> Thuốc; Thuốc \-\> Tác dụng phụ.

### **🧠 Nhánh 2: Tư vấn Tâm lý (Psychological Data)**

* **Thực thể:** Các liệu pháp (CBT, BA, ACT), các bài tập tâm lý, các trạng thái cảm xúc.  
* **Mối quan hệ:** Triệu chứng \-\> Bài tập can thiệp; Liệu pháp \-\> Các bước thực hiện.

## **2\. CẤU TRÚC TỆP DỮ LIỆU CHUẨN (CHO AI IDE NẠP)**

### **Tệp A: MedicalEntities.csv (Các nút tri thức)**

Mỗi dòng là một thực thể. Thành viên Y tế và Tâm lý cùng nạp vào đây nhưng khác category.

|

| **Name** | **Category** | **Specialty** | **Description** |

| **Trầm cảm nội sinh** | DISEASE | Medical | Rối loạn khí sắc do mất cân bằng hóa học não bộ. |

| **Sertraline** | MEDICATION | Medical | Thuốc ức chế tái hấp thu serotonin có chọn lọc (SSRI). |

| **Mất ngủ** | SYMPTOM | Both | Khó đi vào giấc ngủ hoặc duy trì giấc ngủ. |

| **Liệu pháp CBT** | THERAPY | Psychology | Liệu pháp nhận thức hành vi giúp thay đổi suy nghĩ tiêu cực. |

| **Hít thở 4-7-8** | EXERCISE | Psychology | Kỹ thuật kiểm soát hơi thở để giảm căng thẳng cấp tính. |

### **Tệp B: MedicalRelations.csv (Bản đồ kết nối)**

Đây là nơi hai bạn "bắt tay" nhau. Ví dụ: Thành viên Y tế nạp triệu chứng, thành viên Tâm lý nạp bài tập cho triệu chứng đó.

| **Source Name** | **Relation Type** | **Target Name** | **Evidence/Note** |

| Trầm cảm nội sinh | HAS\_SYMPTOM | Mất ngủ | Triệu chứng lâm sàng phổ biến. |

| Trầm cảm nội sinh | TREATED\_BY | Sertraline | Phác đồ điều trị bằng thuốc (Y tế). |

| Mất ngủ | SUGGEST\_INTERVENTION | Hít thở 4-7-8 | Can thiệp mức độ nhẹ (Tâm lý). |

| Sertraline | CONTRAINDICATED | Rượu bia | Cảnh báo an toàn dược phẩm. |

### **Tệp C: InterventionContent.json (Nội dung chi tiết)**

Dành riêng cho thành viên Tâm lý để soạn thảo các "kịch bản" can thiệp.

{  
  "entity\_name": "Hít thở 4-7-8",  
  "steps": \[  
    "Bước 1: Hít vào bằng mũi trong 4 giây",  
    "Bước 2: Nín thở trong 7 giây",  
    "Bước 3: Thở ra hoàn toàn bằng miệng trong 8 giây"  
  \],  
  "target\_care\_level": 1  
}

## **3\. QUY TRÌNH PHỐI HỢP & KIỂM SOÁT ẢO GIÁC**

### **Bước 1: Thống nhất Danh mục (Vocabulary Sync)**

* Trước khi soạn thảo, hai thành viên cần liệt kê danh sách các **Tên thực thể (Name)** dùng chung.  
* *Lưu ý:* Nếu người làm Y tế dùng "Insomnia" mà người làm Tâm lý dùng "Mất ngủ", AI sẽ không hiểu chúng là một. **Ưu tiên dùng tiếng Việt chuẩn.**

### **Bước 2: Thu thập từ nguồn uy tín**

* **Y tế:** Tra cứu danh mục thuốc của Bộ Y tế, phác đồ điều trị tâm thần học lâm sàng.  
* **Tâm lý:** Dựa trên các học liệu về CBT (Cognitive Behavioral Therapy) và BA (Behavioral Activation).

### **Bước 3: Nạp và Gắn nhãn Vector (Chỉ dành cho Coder/Admin)**

* Thành viên dữ liệu chỉ cần gửi file CSV/JSON sạch.  
* Admin sẽ chạy script seed\_medical\_data.py để AI IDE tự động tính toán Vector Embedding cho từng dòng.

## **4\. TIÊU CHUẨN NGHIỆM THU CHO THÀNH VIÊN DỮ LIỆU**

* ![][image1]**Tính nhất quán:** Không có thực thể nào bị trùng lặp tên nhưng khác nghĩa.  
* ![][image1]**Tính kết nối:** Mọi thực thể DISEASE hoặc SYMPTOM đều phải có ít nhất một quan hệ dẫn tới thuốc hoặc bài tập.  
* ![][image1]**Tính an toàn:** Các cảnh báo về thuốc (CONTRAINDICATED) và mức độ nguy cấp (CRISIS\_LEVEL) phải được ưu tiên nạp đầy đủ nhất.  
* ![][image1]**Format chuẩn:** File không bị lỗi font (phải dùng UTF-8), cột phân cách bằng dấu phẩy.

*Ghi chú gửi Data Team: Các bạn là những người xây dựng "linh hồn" cho kiến thức của Aimed AI. Hãy làm việc cực kỳ cẩn trọng với các mối quan hệ (Relations), vì đó là logic để AI suy luận.*

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAUCAYAAAAwe2GgAAAAR0lEQVR4Xu3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4GwdQAAZuLbQIAAAAASUVORK5CYII=>
