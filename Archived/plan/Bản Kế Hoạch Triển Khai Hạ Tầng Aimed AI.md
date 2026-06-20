# **🏗️ BLUEPRINT HẠ TẦNG HỆ THỐNG AIMED AI (PRE-LLM PHASE)**

**Dành cho:** Coder & AI IDE (Cursor/Windsurf/Copilot)

**Nguyên tắc:** Schema-first, Clinical-safety, Mobile-first.

# **GIAI ĐOẠN 1: AUTHENTICATION & CLINICAL ETHICS (HỆ THỐNG GỐC)**

**Mục tiêu:** Thiết lập ranh giới dữ liệu và quyền riêng tư theo chuẩn HIPAA/Medical Ethics.

### **1.1. Database Schema (NeonDB/PostgreSQL)**

Cần AI IDE khởi tạo các Table sau:

* **Table Users**: id (UUID), email, password\_hash, role (ENUM: PATIENT, DOCTOR, ADMIN), stepped\_care\_level (INT: 1-4), created\_at.  
* **Table PatientProfiles**: user\_id, full\_name, date\_of\_birth, phone\_emergency, initial\_phq9\_score.  
* **Table Consents (Quan trọng nhất)**:  
  * id, user\_id, doctor\_id.  
  * grant\_medical\_history (BOOL): Cho phép xem lịch sử bệnh.  
  * grant\_chat\_logs (BOOL): Cho phép xem nội dung chat chi tiết.  
  * status (ENUM: ACTIVE, REVOKED).

### **1.2. Backend API (FastAPI)**

* POST /auth/register: Phân loại role. Nếu là Bác sĩ, mặc định is\_active \= False (chờ Admin duyệt).  
* GET /patients/me/consent: Cho phép bệnh nhân cập nhật quyền riêng tư.  
* GET /doctor/patients: Chỉ trả về danh sách bệnh nhân có Consent.status \== 'ACTIVE'.

# **GIAI ĐOẠN 2: SENSES & KNOWLEDGE BASE (HỆ THẦN KINH NGOẠI VI)**

**Mục tiêu:** Chuẩn bị dữ liệu đầu vào chuẩn xác để chống ảo giác (Anti-hallucination).

### **2.1. GraphRAG Setup (Neo4j)**

* **Node Labels**: Disease, Symptom, Therapy, Medication, CrisisFactor.  
* **Relationship Types**: HAS\_SYMPTOM, CONTRAINDICATED\_WITH, FIRST\_LINE\_TREATMENT.  
* **AI IDE Task**: Viết script ingest\_knowledge.py sử dụng thư viện langchain-community để convert JSON y khoa thành Cypher queries.

### **2.2. Clinical Memory integration (Zep)**

* **Cấu hình**: Kết nối FastAPI với Zep SDK.  
* **Logic**:  
  * Mỗi phiên chat tạo một session\_id.  
  * Zep tự động tóm tắt (Summary) sau mỗi 5-10 turns.  
  * **Metadata trích xuất**: Lưu sentiment\_score và risk\_entities vào metadata của tin nhắn.

### **2.3. Digital Phenotyping (Dấu hiệu số)**

* **Schema**: Table DeviceMetrics: user\_id, metric\_type (steps, sleep\_hours), value, timestamp.  
* **Logic**: AI sẽ đọc bảng này để nhận diện: "User ngủ ít hơn 4h/đêm trong 3 ngày liên tiếp" \-\> Cảnh báo rủi ro trầm cảm tăng cao.

# **GIAI ĐOẠN 3: SAFETY, ROUTING & HANDOVER (LỚP VỎ BẢO VỆ)**

**Mục tiêu:** Đảm bảo hệ thống luôn online và an toàn tuyệt đối.

### **3.1. Deterministic Safety Layer (Middleware)**

* **Regex & Keyword Engine**: Xây dựng bộ lọc chặn các từ khóa tự sát, bạo lực bằng tiếng Việt.  
* **Action**: Nếu trigger \-\> Bỏ qua LLM \-\> Trả về type: "emergency\_redirect" với danh sách hotline (113, 115, BV Tâm thần gần nhất).

### **3.2. Hybrid Smart Routing Logic**

Viết tại backend/core/router.py:

1. Kiểm tra Healthcheck GPU\_SERVER\_URL.  
2. Nếu GPU\_Status \== 200: Route tới Local Llama.  
3. Nếu GPU\_Status \!= 200 HOẶC Latency \> 15s: Chuyển sang Gemini 1.5 Flash API.  
4. Nếu cả hai lỗi: Chuyển sang type: "system\_message" thông báo bảo trì.

### **3.3. SOAP Note Generator (Clinical Handover)**

* **Input**: Zep Memory Summary \+ GraphRAG extracted symptoms.  
* **Output**: Markdown định dạng SOAP (Subjective, Objective, Assessment, Plan).  
* **Trigger**: Khi Bác sĩ nhấn nút "Generate Report" trên Dashboard.

# **GIAI ĐOẠN 4: MOBILE THERAPEUTICS (TRẢI NGHIỆM ĐA THIẾT BỊ)**

**Mục tiêu:** Tối ưu hóa UI cho Mobile-first.

### **4.1. Responsive Design (Tailwind)**

* **Breakpoints**:  
  * Mobile (\< 640px): Sidebar ẩn, dùng Bottom Navigation (Home, Chat, Journal, Profile).  
  * Tablet (640px \- 1024px): Split view giữa nội dung giáo dục và khung chat.  
* **Input**: Nút thu âm (Voice-to-Text) to, dễ nhấn.

### **4.2. PWA & Notifications**

* **Service Worker**: Cache các file psychoeducation.md để đọc offline.  
* **Push Triggers**:  
  * Nhắc nhở: "Đã đến lúc thực hiện bài tập hít thở 2 phút".  
  * Cảnh báo: "Bác sĩ đã xem báo cáo của bạn và có lời nhắn".

# **IV. TIÊU CHÍ NGHIỆM THU CHI TIẾT (DEFINITION OF DONE)**

### **1\. Đối với Coder:**

* \[ \] **Mã nguồn sạch**: Mọi hàm API phải có Docstring mô tả input/output.  
* \[ \] **Schema Validation**: Sử dụng Pydantic cho mọi Request/Response Body.  
* \[ \] **Migration**: Cung cấp file migration database (Alembic/Prisma).

### **2\. Đối với AI IDE (Test Cases):**

* \[ \] **Prompt Test**: "Tạo 1 user role Patient, tắt mọi Consent. Sau đó dùng account Doctor truy cập API chat logs của Patient này". Kết quả mong đợi: 403 Forbidden.  
* \[ \] **Stress Test Fallback**: Giả lập server GPU timeout. Hệ thống phải switch sang Gemini trong \< 2s mà không làm mất tin nhắn hiện tại của User.  
* \[ \] **Mobile Performance**: Kiểm tra điểm Lighthouse trên Mobile đạt \> 90\.

### **3\. Kiểm chứng y khoa (Clinical Check):**

* \[ \] **Privacy Offboarding**: Khi xóa session, kiểm tra database đảm bảo không còn bản ghi clinical\_note nào sót lại.  
* \[ \] **Safety Latency**: Thời gian từ khi nhập "Tôi muốn chết" đến khi hiện hotline phải \< 200ms.