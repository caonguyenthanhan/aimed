# PHẦN HIỆU CHỈNH: TIỂU KẾT CHƯƠNG 1 & SƠ ĐỒ HÌNH 1.7

Dưới đây là phần nội dung văn bản hiệu chỉnh cho phần Tiểu kết Chương 1 của luận văn tốt nghiệp, bao gồm đoạn văn dẫn dắt ngắn và mã nguồn biểu đồ **Mermaid Diagram** được thiết kế lại với cỡ chữ to, khoảng cách thoáng, giúp biên dịch sang Word sắc nét và dễ đọc.

---

## 1. Nội dung đề xuất chèn vào cuối Chương 1

Để tổng kết toàn bộ các định hướng lý thuyết và giải pháp công nghệ đã phân tích trong chương khởi đầu, cấu trúc tổng hòa của hệ thống AiMed được mô phỏng trực quan thông qua sự kết hợp liên ngành giữa khoa học máy tính và tâm lý học lâm sàng.

[CHÈN HÌNH 1.7: Sơ đồ Mindmap tổng hợp sự giao thoa của 4 trụ cột công nghệ và y học tạo nên hệ thống AiMed]

### Sơ đồ Mermaid (Hình 1.7) của hệ thống AiMed:

```mermaid
flowchart LR
    %% Định nghĩa phong cách hiển thị màu sắc trực quan
    classDef root fill:#dae8fc,stroke:#6c8ebf,stroke-width:3px,color:#000,font-weight:bold,font-size:13px;
    classDef level1 fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#000,font-weight:bold,font-size:12px;
    classDef level2 fill:#fff2cc,stroke:#d6b656,stroke-width:1.5px,color:#000,font-size:11px;

    %% Nút gốc
    Root["HỆ THỐNG Y TẾ SỐ AIMED<br/>(Kiến trúc Đóng góp Công nghệ)"]:::root

    %% Các nhánh chính (Level 1)
    N1["1. Cấu trúc Truy vấn<br/>(Hybrid RAG Strategy)"]:::level1
    N2["2. Quản trị Bộ phận AI<br/>(Multi-Agent System)"]:::level1
    N3["3. Chuẩn hóa Ngữ nghĩa<br/>(Semantic Integration)"]:::level1
    N4["4. Giao diện Tương tác<br/>(Context-Aware UI/UX)"]:::level1

    Root --> N1
    Root --> N2
    Root --> N3
    Root --> N4

    %% Các chi tiết dạng danh sách gộp (Giúp chữ to và bố cục đứng cực kỳ gọn trong Word)
    N1 --> N1_detail["• Kết hợp cơ sở dữ liệu Vector (Vector DB)<br/>• Tối ưu hóa Semantic Search & Lexical Search<br/>• Tích hợp tri thức đồ thị (GraphRAG y khoa)"]:::level2
    
    N2 --> N2_detail["• Phân chia tác vụ cho các tác tử chuyên biệt<br/>• Phối hợp Agent giải quyết vấn đề phức tạp<br/>• Ứng dụng khung LLM (LangGraph & LlamaIndex)"]:::level2
    
    N3 --> N3_detail["• Trích xuất thực thể y tế (Symptom, Drug...)<br/>• Đồng bộ từ vựng chuẩn y khoa (ICD-10, Drug)<br/>• Đảm bảo tính bảo mật và an toàn dữ liệu"]:::level2
    
    N4 --> N4_detail["• Hiển thị luồng suy luận AI (Explainability)<br/>• Thiết kế UI/UX sát với nghiệp vụ lâm sàng<br/>• Trải nghiệm phản hồi dạng dòng (Streaming)"]:::level2
```

---

## 2. Phần văn bản đóng góp kỹ thuật bổ trợ

Dựa trên quá trình thiết kế, triển khai và đánh giá, khóa luận mang lại 4 đóng góp chính về mặt kỹ thuật phần mềm y tế:

*   **Đề xuất kiến trúc phần cứng lai (Hybrid GPU-CPU Fallback):** Hệ thống tích hợp thuật toán định tuyến thông minh, tự động chuyển tải (fallback) từ GPU trên đám mây sang CPU cục bộ khi mất kết nối, đảm bảo tính liên tục của dịch vụ y tế.
*   **Xây dựng luồng đa tác tử có kiểm soát (Multi-Agent Routing):** Tách biệt logic lập luận của Tác tử Y khoa và khả năng giao tiếp của Tác tử Tâm lý [11], triệt tiêu hiện tượng xung đột ngữ cảnh trong cùng một phiên xử lý.
*   **Tích hợp đánh giá tâm lý ngầm theo mô hình Stepped Care:** Số hóa thành công thang đo PHQ-9 và GAD-7 vào luồng giao tiếp, cho phép AI tự động phân loại nguy cơ và đề xuất hành vi can thiệp vi mô mà không gây áp lực khảo sát cho người dùng.
*   **Giảm nguy cơ sinh thông tin không có căn cứ bằng GraphRAG:** Chuyển đổi dữ liệu y khoa tiếng Việt thành cấu trúc đồ thị mạng lưới trên Neo4j/Memgraph, ép buộc mô hình ngôn ngữ phải nội suy dựa trên các mối liên hệ đã được đối chiếu, nâng cao tính minh bạch.

Bốn trụ cột đóng góp công nghệ này được tổng hợp trực quan trong **Hình 1.7**.
