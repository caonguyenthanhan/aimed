# PHẦN HIỆU CHỈNH: TIỂU KẾT CHƯƠNG 1 & SƠ ĐỒ HÌNH 1.7

Dưới đây là phần nội dung văn bản hiệu chỉnh cho phần Tiểu kết Chương 1 của luận văn tốt nghiệp, bao gồm đoạn văn dẫn dắt ngắn và mã nguồn biểu đồ **Mermaid Diagram** được thiết kế lại với cỡ chữ to, khoảng cách thoáng, giúp biên dịch sang Word sắc nét và dễ đọc.

---

## 1. Nội dung đề xuất chèn vào cuối Chương 1

Để tổng kết toàn bộ các định hướng lý thuyết và giải pháp công nghệ đã phân tích trong chương khởi đầu, cấu trúc tổng hòa của hệ thống AiMed được mô phỏng trực quan thông qua sự kết hợp liên ngành giữa khoa học máy tính và tâm lý học lâm sàng.

[CHÈN HÌNH 1.7: Sơ đồ Mindmap tổng hợp sự giao thoa của 4 trụ cột công nghệ và y học tạo nên hệ thống AiMed]

### Sơ đồ Mermaid (Hình 1.7) của hệ thống AiMed:

```mermaid
flowchart LR
    %% Định nghĩa phong cách hiển thị
    classDef main fill:#E6F2FF,stroke:#0066CC,stroke-width:3px,font-weight:bold,color:#003366;
    classDef cat fill:#F2F2F2,stroke:#555555,stroke-width:2px,font-weight:bold,color:#333333;
    classDef tech fill:#F9F0FF,stroke:#800080,stroke-width:2px,font-weight:bold,color:#4B0082;
    classDef med fill:#FFF0F0,stroke:#FF0000,stroke-width:2px,font-weight:bold,color:#8B0000;
    classDef node fill:#FFFFFF,stroke:#333333,stroke-width:1.5px,font-size:12px;

    %% Nút trung tâm
    Central["HỆ THỐNG Y TẾ SỐ AIMED"]:::main

    %% Phân hệ
    Central --> Tech["PHÂN HỆ CÔNG NGHỆ<br/>(Hạ tầng & Định tuyến)"]:::cat
    Central --> Med["PHÂN HỆ Y HỌC LÂM SÀNG<br/>(Tri thức & Trị liệu)"]:::cat

    %% Trụ cột Công nghệ
    Tech --> P1["Trụ cột 1: Phần cứng lai<br/>(Hybrid GPU-CPU Fallback)"]:::tech
    Tech --> P2["Trụ cột 2: Luồng Đa tác tử<br/>(Multi-Agent Routing)"]:::tech

    %% Trụ cột Y học
    Med --> P3["Trụ cột 3: Chăm sóc phân tầng<br/>(Stepped Care & Sàng lọc)"]:::med
    Med --> P4["Trụ cột 4: Bảo chứng tri thức<br/>(Neo4j/Memgraph GraphRAG)"]:::med

    %% Chi tiết dạng danh sách gộp (Giúp chữ to và bố cục đứng cực kỳ gọn trong Word)
    P1 --> P1_detail["• GPU Cloud (Primary) làm lõi xử lý chính<br/>• CPU Local (Fallback) chạy offline qua Llama.cpp<br/>• Tự động ngắt phục hồi (SLA) dưới 2,0 giây"]:::node
    
    P2 --> P2_detail["• Định tuyến ngữ nghĩa (Semantic Router) ở biên<br/>• Tách biệt Medical Agent & Psychology Agent<br/>• Triệt tiêu hoàn toàn xung đột ngữ cảnh"]:::node
    
    P3 --> P3_detail["• Sàng lọc ngầm chỉ số PHQ-9 & GAD-7<br/>• 4 Cấp độ can thiệp cá nhân hóa thích ứng<br/>• SOS Emergency Mode ngắt khẩn cấp ở biên"]:::node
    
    P4 --> P4_detail["• Cơ sở dữ liệu tri thức y khoa đồ thị tiếng Việt<br/>• Bóc tách bằng chứng (Evidence Subgraph) y khoa<br/>• Chống ảo giác (Anti-hallucination) nghiêm ngặt"]:::node
```

---

## 2. Phần văn bản đóng góp kỹ thuật bổ trợ

Dựa trên quá trình thiết kế, triển khai và đánh giá, khóa luận mang lại 4 đóng góp chính về mặt kỹ thuật phần mềm y tế:

*   **Đề xuất kiến trúc phần cứng lai (Hybrid GPU-CPU Fallback):** Hệ thống tích hợp thuật toán định tuyến thông minh, tự động chuyển tải (fallback) từ GPU trên đám mây sang CPU cục bộ khi mất kết nối, đảm bảo tính liên tục của dịch vụ y tế.
*   **Xây dựng luồng đa tác tử có kiểm soát (Multi-Agent Routing):** Tách biệt logic lập luận của Tác tử Y khoa và khả năng giao tiếp của Tác tử Tâm lý [11], triệt tiêu hiện tượng xung đột ngữ cảnh trong cùng một phiên xử lý.
*   **Tích hợp đánh giá tâm lý ngầm theo mô hình Stepped Care:** Số hóa thành công thang đo PHQ-9 và GAD-7 vào luồng giao tiếp, cho phép AI tự động phân loại nguy cơ và đề xuất hành vi can thiệp vi mô mà không gây áp lực khảo sát cho người dùng.
*   **Giảm nguy cơ sinh thông tin không có căn cứ bằng GraphRAG:** Chuyển đổi dữ liệu y khoa tiếng Việt thành cấu trúc đồ thị mạng lưới trên Neo4j/Memgraph, ép buộc mô hình ngôn ngữ phải nội suy dựa trên các mối liên hệ đã được đối chiếu, nâng cao tính minh bạch.

Bốn trụ cột đóng góp công nghệ này được tổng hợp trực quan trong **Hình 1.7**.
