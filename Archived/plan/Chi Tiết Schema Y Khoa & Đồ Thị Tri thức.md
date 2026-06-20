# **🧠 MEDICAL KNOWLEDGE GRAPH SCHEMA (POSTGRESQL \+ PGVECTOR)**

Tài liệu này đóng vai trò là "Sách giáo khoa" cho hệ thống. AI IDE cần khởi tạo cấu trúc này để phục vụ bước RAG (Retrieval Augmented Generation) phía sau.

## **0\. BẢN THIẾT KẾ CHUNG (SSOT)**

Tài liệu này là **nguồn sự thật duy nhất** cho: schema DB, chuẩn ingest (CSV/JSON) và mapping dữ liệu \-\> đồ thị.

### **0.1. Chuẩn hóa thực thể (Entities)**

* **name** là tên chuẩn (ưu tiên tiếng Việt).  
* **category: ENUM** gồm: **DISEASE, SYMPTOM, MEDICATION, THERAPY, EXERCISE, CRISIS\_LEVEL**.  
* **specialty**: Medical \| Psychology \| Both (để lọc theo nhánh).  
* **aliases (khuyến nghị)**: danh sách tên gọi khác (VD: "Insomnia") để chống lệch vocabulary.

### **0.2. Chuẩn hóa nội dung can thiệp (Intervention)**

* **InterventionContent chỉ gắn với EXERCISE** (bài tập/kịch bản cụ thể).  
* Nếu cần mô hình hóa mối quan hệ bài tập thuộc liệu pháp: tạo quan hệ **EXERCISE IS\_PART\_OF THERAPY** trong MedicalRelations.

### **0.3. Chuẩn hóa quan hệ (Relations)**

* Giữ **evidence\_level: 1\-5**.  
* Thêm **evidence\_note** để lưu nội dung “Evidence/Note” từ file CSV (không làm mất thông tin).

### **1\. Kiến trúc Đồ thị ảo (Virtual Graph)**

Chúng ta mô phỏng Đồ thị bằng 3 bảng chính trong Neon DB.

#### **1.1. Table MedicalEntities (Các Node)**

Lưu trữ các thực thể y khoa cơ bản.

* id: UUID (Primary Key)  
* name: String (VD: "Trầm cảm", "Mất ngủ", "CBT")  
* category: ENUM (DISEASE, SYMPTOM, MEDICATION, THERAPY, EXERCISE, CRISIS\_LEVEL)  
* specialty: ENUM/TEXT (Medical, Psychology, Both)  
* description: Text (Định nghĩa chuyên môn)  
* aliases: JSON/TEXT\[\] (tuỳ chọn)  
* embedding: VECTOR(1536) \-- Sử dụng pgvector cho OpenAI/Gemini embeddings.

#### **1.2. Table MedicalRelations (Các Cạnh \- Edges)**

Định nghĩa mối quan hệ giữa các thực thể.

* source\_id: UUID (FK tới MedicalEntities)  
* target\_id: UUID (FK tới MedicalEntities)  
* relation\_type: ENUM (  
  HAS\_SYMPTOM, \-- Bệnh A có triệu chứng B  
  CONTRAINDICATED, \-- Bệnh A chống chỉ định với thuốc C  
  TREATED\_BY, \-- Bệnh A điều trị bằng liệu pháp D  
  SUGGEST\_INTERVENTION, \-- Triệu chứng B cần bài tập E  
  IS\_PART\_OF \-- Triệu chứng B thuộc hội chứng F  
  )  
* evidence\_level: INT (1-5) \-- Độ tin cậy của bằng chứng y khoa.
* evidence\_note: Text (tuỳ chọn) \-- Ghi chú/nguồn bằng chứng (mapping từ CSV).

#### **1.3. Table InterventionContent (Nội dung can thiệp)**

Lưu các bài tập cụ thể cho Stepped Care Level 1 & 2\.

* id: UUID  
* entity\_id: UUID (Liên kết tới Node EXERCISE)  
* title: String  
* content\_markdown: Text (Hướng dẫn chi tiết bài tập)  
* target\_care\_level: INT (1-4)

### **2\. Logic Tra cứu (Reference cho Coder & AI IDE)**

Khi "Bộ não" LLM nhận được câu hỏi từ User, nó sẽ thực hiện luồng tra cứu sau:

1. **Bước 1 (Semantic Search)**: SELECT name FROM MedicalEntities ORDER BY embedding \<=\> \[user\_query\_vector\] LIMIT 3;  
2. **Bước 2 (Graph Traversal)**: Tìm các thực thể liên quan qua MedicalRelations.  
   * *Ví dụ*: Nếu tìm thấy "Lo âu", SQL sẽ JOIN để lấy thêm "Bài tập hít thở" (TREATED\_BY) và "Nhịp tim nhanh" (HAS\_SYMPTOM).  
3. **Bước 3 (Context Injection)**: Toàn bộ dữ liệu này được nạp vào Prompt của LLM để trả lời.

### **3\. Hướng dẫn Ingest Dữ liệu (Dành cho AI IDE)**

Coder hãy viết script backend/scripts/seed\_medical\_data.py:

* **Nguồn ingest chuẩn (khuyến nghị):**
  * **MedicalEntities.csv**: Name, Category, Specialty, Description \(\+ Aliases nếu có\)
  * **MedicalRelations.csv**: Source Name, Relation Type, Target Name, Evidence/Note
  * **InterventionContent.json**: entity\_name, steps, target\_care\_level
* **Mapping ingest \-\> DB**
  * Entities.csv \-\> MedicalEntities \(name/category/specialty/description/aliases\)
  * Relations.csv \-\> MedicalRelations \(source/target theo name; relation\_type; evidence\_note; evidence\_level do team gán hoặc rule\)
  * InterventionContent.json \-\> InterventionContent \(entity\_id tra theo entity\_name thuộc category EXERCISE; content\_markdown tạo từ steps\)
* **Embedding**
  * Gọi Embedding API để fill vào cột embedding \(1536\) cho MedicalEntities.
