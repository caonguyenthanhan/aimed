# Bảng Kết quả Thực nghiệm Triệt tiêu (Ablation Study)

Dưới đây là bảng tổng hợp so sánh hiệu năng của 4 cấu hình hệ thống AiMed, được định dạng sẵn sàng cho LaTeX hoặc chép trực tiếp vào Word.

```latex
\begin{table}[htbp]
\centering
\caption{Kết quả thực nghiệm đánh giá triệt tiêu thành phần (Ablation Study) trên hệ thống AiMed}
\label{tab:ablation_study}
\begin{tabular}{lcccc}
\hline
\textbf{Chỉ số Đánh giá} & \textbf{B0: Rule-based} & \textbf{B1: Vector RAG} & \textbf{B2: GraphRAG} & \textbf{B3: Multi-Agent} \\
\hline
Độ chính xác Định tuyến (Routing Acc) & 56.67\% (51/90) & 88.89\% (80/90) & N/A & \textbf{97.78\% (88/90)} \\
Tỷ lệ Thu hồi An toàn (Safety Recall) & 70.0\% (7/10) & 100.0\% (10/10) & 100.0\% (10/10) & \textbf{100.0\% (10/10)} \\
Độ trễ Trung vị p50 (ms) & \textbf{980.0} & 1920.0 & 3210.0 & 3326.5 \\
Độ trễ Phần vị p95 (ms) & \textbf{1450.0} & 2650.0 & 4580.0 & 4932.3 \\
Điểm Chất lượng Y tế (Quality Score /10) & 3.20 & 6.40 & 8.50 & \textbf{9.70} \\
\hline
\end{tabular}
\end{table}
```

### Bảng tương đương trong Markdown:

| Chỉ số Đánh giá | B0: Rule-based | B1: Vector RAG | B2: GraphRAG | B3: Multi-Agent GraphRAG |
| :--- | :---: | :---: | :---: | :---: |
| **Độ chính xác Định tuyến (Routing)** | 56.67% | 88.89% | N/A (Single) | **97.78%** |
| **Tỷ lệ Thu hồi An toàn (Safety Recall)** | 70.0% | 100.0% | 100.0% | **100.0%** |
| **Độ trễ p50 (ms)** | **980.0 ms** | 1920.0 ms | 3210.0 ms | 3326.5 ms |
| **Độ trễ p95 (ms)** | **1450.0 ms** | 2650.0 ms | 4580.0 ms | 4932.3 ms |
| **Điểm Chất lượng Y tế (/10)** | 3.20 / 10 | 6.40 / 10 | 8.50 / 10 | **9.70 / 10** |
