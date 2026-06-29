# PHẦN HIỆU CHỈNH: TIỂU KẾT CHƯƠNG 1 & SƠ ĐỒ HÌNH 1.7

Dưới đây là phần nội dung văn bản hiệu chỉnh cho phần Tiểu kết Chương 1 của luận văn tốt nghiệp, bao gồm đoạn văn dẫn dắt ngắn và mã nguồn biểu đồ **Mermaid Diagram** được thiết kế lại với cỡ chữ to, khoảng cách thoáng, giúp biên dịch sang Word sắc nét và dễ đọc.

---

## 1. Nội dung đề xuất chèn vào cuối Chương 1

Để tổng kết toàn bộ các định hướng lý thuyết và giải pháp công nghệ đã phân tích trong chương khởi đầu, cấu trúc tổng hòa của hệ thống AiMed được mô phỏng trực quan thông qua sự kết hợp liên ngành giữa khoa học máy tính và tâm lý học lâm sàng.

[CHÈN HÌNH 1.7: Sơ đồ Mindmap tổng hợp sự giao thoa của 4 trụ cột công nghệ và y học tạo nên hệ thống AiMed]

### Sơ đồ Mermaid (Hình 1.7) của hệ thống AiMed:

```mermaid
flowchart TD
    %% Định nghĩa phong cách hiển thị màu sắc trực quan
    classDef main fill:#E6F2FF,stroke:#0066CC,stroke-width:3px,font-weight:bold,color:#003366,font-size:13px;
    classDef tech fill:#F9F0FF,stroke:#800080,stroke-width:2px,font-weight:bold,color:#4B0082,font-size:12px;
    classDef med fill:#FFF0F0,stroke:#FF0000,stroke-width:2px,font-weight:bold,color:#8B0000,font-size:12px;

    %% Các nút Trụ cột
    P1["TRỤ CỘT 1: PHẦN CỨNG LAI<br/>(Hybrid GPU-CPU Fallback)<br/>• GPU Cloud chính & CPU Local dự phòng<br/>• Tự động chuyển tải phục hồi dưới 2,0s"]:::tech
    
    P2["TRỤ CỘT 2: ĐA TÁC TỬ KIỂM SOÁT<br/>(Multi-Agent Routing)<br/>• Phân loại ý định bằng Semantic Router<br/>• Tách biệt Medical & Psychology Agent"]:::tech
    
    Central["HỆ THỐNG Y TẾ SỐ AIMED<br/>(Giao thoa Y học & Công nghệ)"]:::main
    
    P3["TRỤ CỘT 3: CHĂM SÓC PHÂN TẦNG<br/>(Stepped Care & Sàng lọc)<br/>• Số hóa trắc nghiệm PHQ-9/GAD-7 ngầm<br/>• 4 Cấp can thiệp & SOS Mode ở biên"]:::med
    
    P4["TRỤ CỘT 4: BẢO CHỨNG TRI THỨC<br/>(Neo4j/Memgraph GraphRAG)<br/>• Đồ thị tri thức y khoa tiếng Việt<br/>• Evidence Subgraph chống ảo giác"]:::med

    %% Định hình bố cục đối xứng 2x2 giao thoa qua tâm
    P1 <--> P2
    P3 <--> P4
    
    P1 <--> Central
    P2 <--> Central
    P3 <--> Central
    P4 <--> Central
```

---

## 2. Phần văn bản đóng góp kỹ thuật bổ trợ

Dựa trên quá trình thiết kế, triển khai và đánh giá, khóa luận mang lại 4 đóng góp chính về mặt kỹ thuật phần mềm y tế:

*   **Đề xuất kiến trúc phần cứng lai (Hybrid GPU-CPU Fallback):** Hệ thống tích hợp thuật toán định tuyến thông minh, tự động chuyển tải (fallback) từ GPU trên đám mây sang CPU cục bộ khi mất kết nối, đảm bảo tính liên tục của dịch vụ y tế.
*   **Xây dựng luồng đa tác tử có kiểm soát (Multi-Agent Routing):** Tách biệt logic lập luận của Tác tử Y khoa và khả năng giao tiếp của Tác tử Tâm lý [11], triệt tiêu hiện tượng xung đột ngữ cảnh trong cùng một phiên xử lý.
*   **Tích hợp đánh giá tâm lý ngầm theo mô hình Stepped Care:** Số hóa thành công thang đo PHQ-9 và GAD-7 vào luồng giao tiếp, cho phép AI tự động phân loại nguy cơ và đề xuất hành vi can thiệp vi mô mà không gây áp lực khảo sát cho người dùng.
*   **Giảm nguy cơ sinh thông tin không có căn cứ bằng GraphRAG:** Chuyển đổi dữ liệu y khoa tiếng Việt thành cấu trúc đồ thị mạng lưới trên Neo4j/Memgraph, ép buộc mô hình ngôn ngữ phải nội suy dựa trên các mối liên hệ đã được đối chiếu, nâng cao tính minh bạch.

Bốn trụ cột đóng góp công nghệ này được tổng hợp trực quan trong **Hình 1.7**.
