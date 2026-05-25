# Báo cáo khám phá dữ liệu Graph (Memgraph CypherL Export)

## 1) Mục tiêu & phạm vi

Tài liệu này là “bản báo cáo khám phá” (data exploration report) cho file xuất dữ liệu Memgraph theo định dạng CypherL:

- File phân tích: [memgraph-export.cypherl](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl)
- Mục tiêu:
  - Mô tả cấu trúc dữ liệu (schema thực tế) của graph: node labels, relationship types, properties.
  - Thống kê định lượng (số node/edge, phân bố labels/relations, nguồn dữ liệu).
  - Phát hiện vấn đề chất lượng dữ liệu (label nổ, lỗi chính tả relation, chuẩn hoá chưa nhất quán).
  - Đề xuất cách khai thác graph cho GraphRAG trong hệ Multi-Agent (Retrieval Agent, Citation, Safety).
- Phạm vi:
  - Không đánh giá tính đúng/sai y khoa của nội dung.
  - Không thay đổi dữ liệu; chỉ đọc file và suy luận schema/đặc tính.

## 2) Phương pháp khám phá

- Đọc các đoạn đại diện để nhận diện mẫu câu lệnh CypherL:
  - Mẫu node `CREATE (:<labels> {<props>});` xem [memgraph-export.cypherl:L1-L20](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L1-L20)
  - Mẫu index + edge `MATCH ... CREATE (u)-[:REL {..}]->(v);` xem [memgraph-export.cypherl:L108287-L108296](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L108287-L108296)
- Quét toàn bộ file theo streaming (không load full vào RAM) để thống kê:
  - Số node/edge.
  - Top labels / label combinations.
  - Top relationship types.
  - Tần suất property keys.
  - Phân bố `collection`, số lượng `id_doc` và `id_chunk` khác nhau.

## 3) Tổng quan file

- Kích thước file: ~92.04 MB (96,515,202 bytes)
- Dạng dữ liệu: script CypherL gồm 3 phần logic:
  - (A) Khởi tạo node: nhiều dòng `CREATE (:__mg_vertex__:<labels> {..});`
  - (B) Khởi tạo index: `CREATE INDEX ON :__mg_vertex__(__mg_id__);`
  - (C) Khởi tạo relationships: nhiều dòng `MATCH ... WHERE u.__mg_id__ = ... AND v.__mg_id__ = ... CREATE (u)-[:`REL` {...}]->(v);`
- File có vẻ là 1 “snapshot export” dùng internal id `__mg_id__` để nối cạnh.

## 4) Thống kê định lượng (kết quả quét file)

### 4.1. Kích thước graph

- Nodes: 108,286
- Edges: 323,126
- Số relationship types (distinct): 75
- Số labels (distinct): 2,174
- Số label combinations (distinct): 3,035

### 4.2. Dải định danh & nguồn gốc

- `__mg_id__`:
  - Min: 324,860
  - Max: 433,145
- `id_doc` (distinct): 5,186
- `id_chunk` (distinct): 23,126
- `collection` (node-level):
  - `benh`: 56,259 nodes
  - `thuoc`: 52,027 nodes

Nhận xét:
- `id_doc` và `id_chunk` cho thấy graph được sinh từ pipeline “chia nhỏ văn bản thành chunks” rồi trích xuất entities/relations theo từng chunk.
- `collection` cho thấy ít nhất 2 tập dữ liệu nguồn: bài bệnh học (`benh`) và bài thuốc (`thuoc`).

## 5) Mô hình node (vertex) – schema thực tế

### 5.1. Mẫu câu lệnh tạo node

Ví dụ (rút gọn):

- Node tạo bằng `CREATE` kèm nhiều labels:
  - `__mg_vertex__`: label kỹ thuật để Memgraph quản lý vertex nội bộ.
  - `Entity`: label tổng quát (xuất hiện trên 100% nodes).
  - Các labels còn lại là nhãn phân loại/khái niệm y tế (ví dụ `BIẾN_CHỨNG`, `TRIỆU_CHỨNG`, `BỆNH_LÝ`, …) và đôi khi là nhãn dài bất thường.

Tham chiếu:
- [memgraph-export.cypherl:L1-L20](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L1-L20)

### 5.2. Properties của node (đồng nhất toàn bộ)

Top property keys xuất hiện trên node:

- `name` (108,286/108,286)
- `src` (108,286/108,286)
- `id_chunk` (108,286/108,286)
- `id_doc` (108,286/108,286)
- `collection` (108,286/108,286)
- Ngoài ra có `__mg_id__` (không bọc backtick) dùng làm khoá nối edges.

Ý nghĩa suy luận:
- `name`: tên thực thể (entity string), ví dụ “hen phế quản”, “nhồi máu cơ tim”, …
- `src`: tiêu đề/nguồn văn bản (có vẻ là title của bài thuốc/bài bệnh).
- `id_doc`: id tài liệu gốc.
- `id_chunk`: id của đoạn (chunk) nơi entity được trích xuất.
- `collection`: phân nhóm nguồn dữ liệu (`benh`/`thuoc`).
- `__mg_id__`: internal id của Memgraph vertex để edges refer.

### 5.3. Labels của node (vấn đề quan trọng: “label explosion”)

Thống kê top labels (ngoài `Entity`):
- `TRIỆU_CHỨNG`: 14,833
- `BỆNH_LÝ`: 8,009
- `NGUYÊN_NHÂN`: 6,523
- `THUỐC`: 6,346
- `PHƯƠNG_PHÁP_ĐIỀU_TRỊ`: 5,871
- `NGUY_CƠ`: 4,163
- `PHƯƠNG_PHÁP_CHẨN_ĐOÁN`: 4,005
- `BIẾN_CHỨNG`: 3,756
- `TÁC_DỤNG_PHỤ`: 3,486
- …

Quan sát nổi bật:
- Có **2,174 labels** trong khi chỉ có **108,286 nodes**.
- Xuất hiện labels cực dài dạng “câu hướng dẫn liều dùng/cách dùng” (1 node/label), ví dụ label dài nhất dài ~212 ký tự (1 lần xuất hiện).
  - Có thể xem ví dụ label dạng này ở [memgraph-export.cypherl:L128-L129](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L128-L129)

Hệ quả:
- Việc dùng labels để mang nội dung mô tả dài (thay vì property) làm schema trở nên “khó kiểm soát”, gây khó khăn cho:
  - thiết kế index/constraint theo label,
  - truy vấn theo category,
  - chuẩn hoá analytics,
  - và tăng rủi ro lỗi chính tả/encoding trong label.

Khuyến nghị (cho luận văn/phân tích hệ thống):
- Xem `Entity` như **node type chính**.
- Xem label phụ như “category tag” nhưng nên quy hoạch lại thành 1 property chuẩn hoá như `type` hoặc `category` (nếu có quyền sửa pipeline tương lai).

## 6) Mô hình cạnh (relationship) – schema thực tế

### 6.1. Mẫu câu lệnh tạo cạnh

Edges được tạo theo pattern:

1) `MATCH` tìm 2 vertex theo `__mg_id__`
2) `CREATE` edge có type nằm trong backticks

Ví dụ:
- [memgraph-export.cypherl:L108288-L108296](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L108288-L108296)

### 6.2. Properties của cạnh (đồng nhất)

Top edge properties:
- `id_chunk` (323,126/323,126)
- `id_doc` (323,126/323,126)
- `collection` (323,126/323,126)

Ý nghĩa:
- Edges cũng có provenance theo chunk/doc tương tự node.
- Điều này rất hữu ích cho GraphRAG để trích dẫn (citation) theo “nguồn” (doc/title) và “ngữ cảnh xuất hiện” (chunk).

### 6.3. Relationship types (top và phân bố)

Top relationship types theo số lượng:
- `TÁC_DỤNG_PHỤ`: 103,622
- `CÔNG_DỤNG`: 32,334
- `TRIỆU_CHỨNG`: 20,947
- `THẬN_TRỌNG`: 17,652
- `NGUY_CƠ`: 16,359
- `NGUYÊN_NHÂN`: 15,612
- `TƯƠNG_TÁC_THUỐC`: 15,254
- `CHỐNG_CHỈ_ĐỊNH`: 14,184
- `PHƯƠNG_PHÁP_ĐIỀU_TRỊ`: 11,015
- `THÀNH_PHẦN`: 10,113
- `TÁC_ĐỘNG_LÊN`: 10,089
- …

Nhận xét nghiệp vụ (giải thích “tại sao”):
- Tập `thuoc` có nhiều thông tin dạng cấu trúc “tác dụng phụ / chống chỉ định / tương tác / thận trọng” → các cạnh dạng này dày đặc, làm `TÁC_DỤNG_PHỤ` chiếm tỉ lệ lớn.
- Tập `benh` có nhiều “nguyên nhân / triệu chứng / biến chứng / chẩn đoán / điều trị” → các cạnh dạng bệnh lý cũng nhiều nhưng phân tán.

### 6.4. Lỗi chính tả / biến thể cạnh (data quality)

Tồn tại nhiều relationship types hiếm (tần suất < 200) có vẻ là biến thể lỗi do chuẩn hoá/encoding, ví dụ:
- biến thể của `THẬN_TRỌNG`: `THẬN_TRỌ`, `THẬT_TRỌNG`, `THẬN_TRƯỜNG`, …
- biến thể của `TƯƠNG_TÁC_THUỐC`: `TƯƠNG_TÁC_THUOC`, `TƯƠLYNG_TÁC_THUỐC`, …
- biến thể của `CHUYỂN_HÓA`: `CHUYỂN_HÓA`, `CHUYỂN_HÓA`, `CHUYỂY_HÓA`, `CHUYỂ_HÓA`, …
- biến thể của `PHƯƠNG_PHÁP_CHẨN_ĐOÁN`: `PHƯƠP_PHÁP...`, `PHƯƠPHÁP...`, …

Hệ quả:
- Khi truy vấn theo relationship type, cần:
  - match nhiều biến thể (rủi ro thiếu recall),
  - hoặc phải có bước chuẩn hoá type trước khi ingest,
  - hoặc viết tool layer gom nhóm.

## 7) Index/Constraint quan sát được

File có statement:
- `CREATE INDEX ON :__mg_vertex__(__mg_id__);` xem [memgraph-export.cypherl:L108287](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/memgraph-export.cypherl#L108287)

Nhận xét:
- Index `__mg_id__` là bắt buộc vì edges nối bằng MATCH theo `__mg_id__`.
- Nếu cần truy vấn runtime theo `name`, `id_doc`, `id_chunk`, có thể cân nhắc thêm index theo workload (tuỳ Memgraph hỗ trợ và chiến lược ingest).

## 8) Diễn giải “graph nghĩa là gì?” theo hướng GraphRAG

### 8.1. Diễn giải mức trừu tượng

Graph này biểu diễn các “thực thể y khoa” (entity) và “quan hệ giữa các thực thể” được trích xuất từ văn bản y khoa:

- Node: Entity (được gán thêm nhãn category).
- Edge: quan hệ ngữ nghĩa (symptom-of, cause-of, contraindication-of, adverse-effect-of, …) — thể hiện bằng relationship type tiếng Việt (đã chuẩn hoá một phần).
- Provenance: `src`, `id_doc`, `id_chunk`, `collection` giúp truy nguyên nguồn.

### 8.2. Điểm mạnh cho GraphRAG

- Có provenance rõ ràng → dễ làm “citation” (trích dẫn nguồn) trong trả lời.
- Quan hệ dạng y học thực dụng (triệu chứng, nguyên nhân, điều trị, tác dụng phụ, tương tác thuốc) → rất hợp cho hỏi đáp.
- Tập dữ liệu thuốc và bệnh cùng tồn tại → có thể hỗ trợ câu hỏi liên kết bệnh–thuốc (nhưng cần chú ý safety).

### 8.3. Điểm yếu/rủi ro

- Label explosion (labels cực dài, nhiều label 1 lần) khiến schema “khó quản trị”.
- Relationship type có lỗi chính tả → cần layer chuẩn hoá khi truy vấn.
- Chưa thấy thông tin “đoạn text gốc của chunk” nằm trong graph; chỉ có `src/id_doc/id_chunk`. Nếu muốn citation chuẩn, cần có bảng/DB khác map từ `id_chunk` → nội dung chunk.

## 9) Gợi ý truy vấn (Cypher) phục vụ Retrieval trong GraphRAG

### 9.1. Tìm entity theo tên (exact/contains)

```cypher
MATCH (e:Entity)
WHERE toLower(e.name) CONTAINS toLower($q)
RETURN e.__mg_id__ AS id, e.name AS name, labels(e) AS labels, e.collection AS collection, e.src AS src
LIMIT 20;
```

### 9.2. Lấy “lân cận 1-hop” để làm bằng chứng (evidence subgraph)

```cypher
MATCH (e:Entity)
WHERE toLower(e.name) CONTAINS toLower($q)
MATCH (e)-[r]->(n:Entity)
RETURN
  e.name AS center,
  type(r) AS rel,
  n.name AS neighbor,
  r.id_doc AS id_doc,
  r.id_chunk AS id_chunk,
  r.collection AS collection
LIMIT 50;
```

### 9.3. Truy vấn theo “thuốc → tác dụng phụ” (workload thuốc)

```cypher
MATCH (drug:Entity)
WHERE drug.collection = "thuoc" AND toLower(drug.name) CONTAINS toLower($drug_name)
MATCH (drug)-[r:`TÁC_DỤNG_PHỤ`]->(ae:Entity)
RETURN drug.name AS drug, ae.name AS adverse_effect, r.id_doc AS id_doc, r.id_chunk AS id_chunk
LIMIT 50;
```

### 9.4. Truy vấn theo “bệnh → triệu chứng / nguyên nhân / điều trị” (workload bệnh)

```cypher
MATCH (d:Entity)
WHERE d.collection = "benh" AND toLower(d.name) CONTAINS toLower($disease)
OPTIONAL MATCH (d)-[:`TRIỆU_CHỨNG`]->(s:Entity)
OPTIONAL MATCH (d)-[:`NGUYÊN_NHÂN`]->(c:Entity)
OPTIONAL MATCH (d)-[:`PHƯƠNG_PHÁP_ĐIỀU_TRỊ`]->(t:Entity)
RETURN d.name AS disease,
       collect(DISTINCT s.name)[..20] AS symptoms,
       collect(DISTINCT c.name)[..20] AS causes,
       collect(DISTINCT t.name)[..20] AS treatments;
```

### 9.5. Cảnh báo về biến thể relationship type

Nếu gặp lỗi do biến thể type, có thể query theo `type(r)` và lọc bằng `STARTS WITH` (giải pháp “chữa cháy”, không tối ưu):

```cypher
MATCH (a:Entity)-[r]->(b:Entity)
WHERE type(r) STARTS WITH "THẬN_TR"
RETURN a.name, type(r), b.name
LIMIT 50;
```

## 10) Gợi ý tích hợp vào hệ Multi-Agent (phần phục vụ luận văn)

Phần này mô tả cách graph được “đóng gói” thành công cụ (tool) để Multi-Agent dùng trong GraphRAG + Function Calling (Llama/vLLM).

### 10.1. Vai trò tác tử đề xuất (tập trung Multi-Agent)

- **Orchestrator Agent**: điều phối, chọn agent con, hợp nhất câu trả lời, quyết định actions (UI navigation).
- **Graph Retrieval Agent (GraphRAG Agent)**:
  - nhận câu hỏi + entity candidates,
  - gọi tool `graph.search`/`graph.neighborhood`,
  - trả về “evidence bundle”: danh sách triples + provenance (src/id_doc/id_chunk).
- **Medical Triage Agent**:
  - phân loại mức độ khẩn (emergency vs non-emergency),
  - quyết định cần hỏi thêm gì,
  - ép guardrails: không kê đơn, không chẩn đoán tuyệt đối.
- **Psychological Support Agent**:
  - hỗ trợ tâm lý, sàng lọc rủi ro (tự hại, hoảng loạn),
  - áp dụng guideline giao tiếp an toàn.
- **Safety/Compliance Agent**:
  - rà soát đầu ra cuối: cấm nội dung nguy hiểm, thêm khuyến cáo đi khám khi cần,
  - kiểm tra “ảo giác nguồn” (không được bịa `src/id_chunk`).

### 10.2. Tool design tối thiểu cho GraphRAG Agent

Đề xuất 2 tools:

1) `graph.search_entities(q, collection?)`
- Input: chuỗi truy vấn người dùng (hoặc entity mention), optional lọc `collection`.
- Output: danh sách candidates (id, name, labels, src, id_doc/id_chunk).

2) `graph.get_evidence(center_ids, depth=1, rel_allowlist?)`
- Input: danh sách `__mg_id__` của entities trung tâm.
- Output: subgraph edges (triples) kèm provenance.

Điểm quan trọng cho Function Calling:
- Output phải có schema ổn định, ưu tiên JSON phẳng:
  - `entities[]`, `evidence_edges[]`, `sources[]`.
- “Citation contract” tối thiểu:
  - mỗi evidence edge phải có `{ id_doc, id_chunk, collection, src? }`.

### 10.3. Tạo “citation” từ provenance

Vì graph không chứa nội dung chunk text, có 2 hướng:
- (A) chỉ trích dẫn mức “tiêu đề nguồn (src)” + doc id/chunk id (phù hợp demo).
- (B) cần thêm kho dữ liệu “chunk store” (DB bảng/JSONL) để map `id_chunk` → `chunk_text` và dùng đúng đoạn làm trích dẫn (phù hợp luận văn chuẩn).

### 10.4. Liên hệ với UI actions trong hệ thống hiện tại

Hệ thống hiện tại đã có contract `{ response, actions, metadata }` và allowlist navigation. Khi GraphRAG Agent đưa ra evidence:
- Orchestrator vẫn có thể quyết định action như:
  - `navigate` sang trang tra cứu (`/tra-cuu`) hoặc trang tư vấn (`/tu-van`) để hiển thị kết quả.
- `metadata` nên bao gồm:
  - `retrieval: { used_graph: true, evidence_count: n, collections: [...] }`

## 11) Kết luận

- File CypherL export mô tả 1 graph quy mô vừa (108k nodes / 323k edges), phù hợp triển khai GraphRAG runtime.
- Node/edge đều có provenance (`src/id_doc/id_chunk/collection`) – rất giá trị cho “bằng chứng” trong trả lời.
- Tuy nhiên, schema có các vấn đề chuẩn hoá đáng kể:
  - label explosion (2,174 labels, nhiều label dài bất thường),
  - relationship type bị lỗi chính tả/biến thể.
- Để dùng hiệu quả trong Multi-Agent:
  - nên đặt GraphRAG vào 1 agent chuyên Retrieval, và có Safety agent kiểm chứng citation,
  - tool layer cần gom/chuẩn hoá relationship type để tăng recall và giảm rủi ro query miss.

