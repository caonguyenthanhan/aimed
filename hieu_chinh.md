# PHẦN HIỆU CHỈNH: TIỂU KẾT CHƯƠNG 1 & SƠ ĐỒ HÌNH 1.7

Dưới đây là phần nội dung văn bản hiệu chỉnh cho phần Tiểu kết Chương 1 của luận văn tốt nghiệp, bao gồm đoạn văn dẫn dắt ngắn và mã nguồn biểu đồ **Mermaid Diagram** được thiết kế lại với cỡ chữ to, khoảng cách thoáng, giúp biên dịch sang Word sắc nét và dễ đọc.

---

## 1. Nội dung đề xuất chèn vào cuối Chương 1

Để tổng kết toàn bộ các định hướng lý thuyết và giải pháp công nghệ đã phân tích trong chương khởi đầu, cấu trúc tổng hòa của hệ thống AiMed được mô phỏng trực quan thông qua sự kết hợp liên ngành giữa khoa học máy tính và tâm lý học lâm sàng.

[CHÈN HÌNH 1.7: Sơ đồ Mindmap tổng hợp sự giao thoa của 4 trụ cột công nghệ và y học tạo nên hệ thống AiMed]

### Sơ đồ Mermaid (Hình 1.7) của hệ thống AiMed:

```mermaid
flowchart TD
    %% Định nghĩa các lớp phong cách hiển thị
    classDef main fill:#E6F2FF,stroke:#0066CC,stroke-width:3px,font-weight:bold,color:#003366;
    classDef tech fill:#F9F0FF,stroke:#800080,stroke-width:2px,font-weight:bold,color:#4B0082;
    classDef med fill:#FFF0F0,stroke:#FF0000,stroke-width:2px,font-weight:bold,color:#8B0000;
    classDef node fill:#FFFFFF,stroke:#333333,stroke-width:1px,font-size:12px;

    %% Nút gốc trung tâm
    Central["HỆ THỐNG Y TẾ SỐ AIMED<br/>(Giao thoa Y học & Công nghệ)"]:::main

    %% Trụ cột 1: Kiến trúc phần cứng lai
    P1["TRỤ CỘT 1<br/>Kiến trúc Phần cứng lai<br/>(Hybrid GPU-CPU Fallback)"]:::tech
    P1_1["GPU Cloud (Primary)<br/>Xử lý tác vụ nặng, độ trễ thấp"]:::node
    P1_2["CPU Local (Fallback)<br/>Đảm bảo dịch vụ chạy offline"]:::node
    P1_3["Chống chịu lỗi (SLA)<br/>Chuyển tải tự động dưới 2s"]:::node

    %% Trụ cột 2: Định tuyến đa tác tử
    P2["TRỤ CỘT 2<br/>Luồng Đa tác tử kiểm soát<br/>(Multi-Agent Routing)"]:::tech
    P2_1["Semantic Router<br/>Phân loại ý định ở local"]:::node
    P2_2["Medical Agent<br/>Truy vấn thông tin bệnh lý"]:::node
    P2_3["Psychology Agent<br/>Trò chuyện đồng cảm, nâng đỡ"]:::node

    %% Trụ cột 3: Chăm sóc phân tầng
    P3["TRỤ CỘT 3<br/>Mô hình Chăm sóc Phân tầng<br/>(Stepped Care & Sàng lọc ngầm)"]:::med
    P3_1["Sàng lọc tự động<br/>Tích hợp PHQ-9 & GAD-7 ngầm"]:::node
    P3_2["Can thiệp cá nhân hóa<br/>4 Cấp độ hỗ trợ thích ứng"]:::node
    P3_3["SOS Emergency Mode<br/>Chốt chặn an toàn y khoa biên"]:::node

    %% Trụ cột 4: Ràng buộc y khoa GraphRAG
    P4["TRỤ CỘT 4<br/>Đảm bảo chứng cứ y khoa<br/>(Neo4j/Memgraph GraphRAG)"]:::med
    P4_1["Knowledge Graph<br/>Đồ thị tri thức y khoa tiếng Việt"]:::node
    P4_2["Evidence Subgraph<br/>Bóc tách mối quan hệ đa chiều"]:::node
    P4_3["Anti-Hallucination<br/>Nội suy ràng buộc bằng chứng"]:::node

    %% Thiết lập liên kết liên sơ đồ
    Central --> P1
    Central --> P2
    Central --> P3
    Central --> P4

    P1 --> P1_1
    P1 --> P1_2
    P1 --> P1_3

    P2 --> P2_1
    P2 --> P2_2
    P2 --> P2_3

    P3 --> P3_1
    P3 --> P3_2
    P3 --> P3_3

    P4 --> P4_1
    P4 --> P4_2
    P4 --> P4_3
```

---

## 2. Phần văn bản đóng góp kỹ thuật bổ trợ

Dựa trên quá trình thiết kế, triển khai và đánh giá, khóa luận mang lại 4 đóng góp chính về mặt kỹ thuật phần mềm y tế:

*   **Đề xuất kiến trúc phần cứng lai (Hybrid GPU-CPU Fallback):** Hệ thống tích hợp thuật toán định tuyến thông minh, tự động chuyển tải (fallback) từ GPU trên đám mây sang CPU cục bộ khi mất kết nối, đảm bảo tính liên tục của dịch vụ y tế.
*   **Xây dựng luồng đa tác tử có kiểm soát (Multi-Agent Routing):** Tách biệt logic lập luận của Tác tử Y khoa và khả năng giao tiếp của Tác tử Tâm lý [11], triệt tiêu hiện tượng xung đột ngữ cảnh trong cùng một phiên xử lý.
*   **Tích hợp đánh giá tâm lý ngầm theo mô hình Stepped Care:** Số hóa thành công thang đo PHQ-9 và GAD-7 vào luồng giao tiếp, cho phép AI tự động phân loại nguy cơ và đề xuất hành vi can thiệp vi mô mà không gây áp lực khảo sát cho người dùng.
*   **Giảm nguy cơ sinh thông tin không có căn cứ bằng GraphRAG:** Chuyển đổi dữ liệu y khoa tiếng Việt thành cấu trúc đồ thị mạng lưới trên Neo4j/Memgraph, ép buộc mô hình ngôn ngữ phải nội suy dựa trên các mối liên hệ đã được đối chiếu, nâng cao tính minh bạch.

Bốn trụ cột đóng góp công nghệ này được tổng hợp trực quan trong **Hình 1.7**.
