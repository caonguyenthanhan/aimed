Say hi Aleian

Mình sẽ rà lại hai báo cáo để gom toàn bộ tồn đọng, đối chiếu phần P0 đã sửa một phần, rồi lập kế hoạch khắc phục theo thứ tự ưu tiên và đường kiểm chứng rõ ràng.
        
            
toolName: search_by_regex
            
status: success
          
query: FAIL|WARN|P0|Vấn Đề Còn Tồn|Tồn đọng|Kết Luận|Graph|pass|runtime|UI|demo
          

        
            
toolName: search_by_regex
            
status: success
          
query: FAIL|WARN|P0|Vấn Đề Còn Tồn|Tồn đọng|Kết Luận|Graph|pass|runtime|UI|demo
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 3 items
          
Say hi Aleian

Mình đã gom được hai nguồn: `report1` thiên về lỗi test thực tế, còn `report2` ghi khá rõ plan P0 ban đầu và các phần đã đụng vào boot/UI/pass; giờ mình đọc các đoạn chốt để tách “đã sửa một phần” khỏi “còn tồn thật sự”.
        
            
toolName: view_files
            
status: success
          
            
filePath: d:\desktop\tlcn\medical consulting system\_workspace\report1.md
          

        
            
toolName: view_files
            
status: success
          
            
filePath: d:\desktop\tlcn\medical consulting system\_workspace\report1.md
          

        
            
toolName: view_files
            
status: success
          
            
filePath: d:\desktop\tlcn\medical consulting system\_workspace\report2.md
          

        
            
toolName: view_files
            
status: success
          
            
filePath: d:\desktop\tlcn\medical consulting system\_workspace\report2.md
          

        
            
toolName: search_by_regex
            
status: success
          
query: runtime-sync|start_demo_ngrok|run_cpu_server_ngrok|chat-interface.tsx|live/access|runtime/mode|compute-toggle|llm-chat|agent-chat|DEFAULT_INTERNAL_DEMO_PASS|INTERNAL_DEMO_PASS
          

        
            
toolName: view_files
            
status: success
          
            
filePath: d:\desktop\tlcn\medical consulting system\_workspace\report2.md
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 3 items
          
Say hi Aleian

**Cơ Sở Lập Kế Hoạch**
- Mình bám vào các tồn đọng được chốt trong [report1.md](file:///d:/desktop/tlcn/medical%20consulting%20system/_workspace/report1.md#L1030-L1109): `CPU/ngrok`, `graph 404/timeout`, `UI state lệch backend`, `popup API key/pass`, `sidebar connection`, `follow-up triage`, `FOZA timeout`, `GPU/registry`.
- Mình cũng bám vào phần P0 đã được thiết kế và đã sửa một phần trong [report2.md](file:///d:/desktop/tlcn/medical%20consulting%20system/_workspace/report2.md#L26-L163) và [report2.md](file:///d:/desktop/tlcn/medical%20consulting%20system/_workspace/report2.md#L1506-L1715): đã có hướng `one-click demo boot`, `runtime sync`, `internal pass`, `health-first startup`, nhưng chưa nghiệm thu end-to-end trên live.

**Nhận Định Nhanh**
- P0 không phải làm lại từ đầu; đúng hơn là đang ở trạng thái `đã vá nền`, nhưng `chưa deploy/verify đủ` nên live vẫn lộ lỗi cũ.
- Thứ tự đúng không nên bắt đầu từ UI hay prompt trước; phải khóa `runtime + graph + pass demo` trước, nếu không mọi test FE sẽ tiếp tục cho kết quả nhiễu.
- Mục tiêu thực tế nên là: `đưa demo về trạng thái chạy ổn định trước`, rồi mới xử lý nhóm `chất lượng hội thoại` và `GPU/registry`.

**Kế Hoạch Sửa Chữa**
- **Phase 0 - Chốt Delta Thực Tế**
- Đối chiếu `code local` với `live đang chạy` để xác định phần nào đã sửa nhưng chưa lên Vercel.
- Kiểm tra 4 điểm bắt buộc trên live: `/api/runtime/mode`, `/api/live/access`, `/api/mcp/call graph.status`, `/api/agent-chat`.
- Kết quả cần có: bảng `đã fix local`, `đã deploy`, `chưa deploy`, `deploy rồi nhưng còn lỗi logic`.
- Output của phase này là một checklist release ngắn để tránh sửa lặp.

- **Phase 1 - Ổn Định Boot Và Runtime Demo**
- Hợp nhất boot flow về một entry duy nhất, ưu tiên dùng `start_demo_ngrok.bat` làm entry chuẩn thay vì thêm nhiều file bat mới.
- Trong launcher, khóa 5 bước tuần tự: `Docker/Memgraph ready` -> `CPU healthy` -> `graph.status reachable` -> `ngrok public URL ready` -> `frontend start`.
- Bắt buộc in summary cuối phiên: `CPU local`, `CPU public`, `graph connected`, `frontend URL`, `demo pass`, `smoke result`.
- Nếu một bước fail thì dừng ngay với lỗi ngắn, không tiếp tục boot nửa vời.
- File đụng chính: `start_demo_ngrok.bat`, `cpu_server/launcher/run.ps1`, `cpu_server/launcher/run_cpu_server_ngrok.py`.

- **Phase 2 - Sửa Live Graph 404/Timeout**
- Xử lý đây là blocker số 1 vì nó làm `graph_injected=false` và phá context demo.
- Kiểm tra đường đi thật của `CPU_SERVER_URL` từ local launcher -> `.env.local` -> Vercel env -> `api/mcp/call`.
- Thống nhất contract lỗi graph: phân biệt rõ `graph_404`, `graph_timeout`, `graph_down`, không gom mơ hồ thành một trạng thái chung.
- Sau mỗi lần restart ngrok, cần có bước cập nhật lại `CPU_SERVER_URL` và verify ngay bằng `graph.status`.
- File đụng chính: `medical-consultation-app/app/api/mcp/call/route.ts`, `cpu_server/server.py`, launcher CPU/ngrok.

- **Phase 3 - Hoàn Tất Demo Pass Nội Bộ**
- Chốt một nguồn duy nhất: `INTERNAL_DEMO_PASS`.
- `agent-chat`, `live/access`, `llm-chat` phải dùng cùng resolver và cùng rule so khớp pass.
- FE phải seed pass demo mặc định cho luồng nội bộ, nhưng không hiển thị công khai theo kiểu hard-code rải rác.
- Khi `demo_mode=true`, UI không được bật popup chặn flow chỉ vì quota/key system.
- Đây là phase cần xử lý ngay sau graph vì live đang trả `403 Invalid pass`.
- File đụng chính: `medical-consultation-app/app/api/agent-chat/route.ts`, `medical-consultation-app/app/api/live/access/route.ts`, `medical-consultation-app/app/api/llm-chat/route.ts`, `medical-consultation-app/lib/runtime-sync.ts`, `medical-consultation-app/components/chat-interface.tsx`.

- **Phase 4 - Đồng Bộ UI State Với Backend**
- Chốt một object trạng thái chung cho FE render: `provider`, `mode`, `graph_connected`, `graph_injected`, `graph_reason`, `db_ok`, `fallback`, `error`, `demo_mode`.
- `header badge`, `context modal`, `sidebar status`, `compute toggle` phải đọc cùng nguồn truth này; không để mỗi nơi tự suy luận từ polling/localStorage khác nhau.
- Tách rõ `db ok` và `server unavailable` để UI không còn cảnh `db: ok` nhưng vẫn báo đỏ `Không kết nối được`.
- `runtime/mode` phải luôn trả `provider`; FE không được tự đoán provider từ state cũ.
- File đụng chính: `medical-consultation-app/components/chat-interface.tsx`, `medical-consultation-app/components/compute-toggle.tsx`, `medical-consultation-app/app/api/runtime/mode/route.ts`.

- **Phase 5 - Sửa Luồng Demo Và Context Viewer**
- Khi đang ở demo mode, `Xem context` phải luôn mở được, kể cả graph fail hoặc fallback đang bật.
- Popup `API Key / Pass` chỉ nên là nhánh phụ, không phải blocker của luồng demo nội bộ.
- Nếu graph fail, context vẫn phải hiển thị rõ `reason`, `status_code`, `endpoint`, `fallback_chain`.
- Phase này chủ yếu là chỉnh hành vi FE theo contract đã khóa ở Phase 3-4.

- **Phase 6 - Cải Thiện Follow-Up Triage**
- Sau khi hệ thống ổn định, mới xử lý lỗi sản phẩm: follow-up `không khó thở` không được route sang CTA/hẹn bác sĩ quá sớm.
- Cần chỉnh `triage policy` để agent ưu tiên tiếp tục khai thác triệu chứng, phân tầng nguy cơ, rồi mới gợi ý action.
- Bổ sung regression cho 2 ca chuẩn: `sốt nhẹ, đau họng, mệt 2 ngày` và `đau ngực dữ dội lan tay trái, khó thở`.
- File đụng chính: `cpu_server/langgraph_agent/graph.py`, `cpu_server/langgraph_agent/runtime.py`.

- **Phase 7 - Cấu Hình Timeout Và Nhánh GPU**
- Tăng và thống nhất `FOZA_REQUEST_TIMEOUT_MS` theo thực tế đo được, tránh local/live lệch nhau.
- Nếu chưa dùng GPU thật thì tạm hạ scope: đánh dấu `GPU tests = blocked by config`, không để matrix test luôn đỏ vì thiếu env.
- Quyết định rõ 1 trong 2 hướng: `bổ sung hẳn server-registry.json + GPU env`, hoặc `gỡ dependency registry/GPU khỏi smoke hiện tại`.

**Thứ Tự Triển Khai Khuyến Nghị**
- 1. `Runtime + graph`
- 2. `Internal pass + demo mode`
- 3. `UI state sync + sidebar`
- 4. `Deploy lại live`
- 5. `Regression demo`
- 6. `Follow-up triage`
- 7. `GPU/registry`

**Phân Nhánh Công Việc**
- **Nhánh A - Hạ tầng demo**
- Làm `boot`, `health`, `ngrok`, `CPU_SERVER_URL`, `graph.status`, `smoke`.
- Mục tiêu: local và live có backend thật để test.
- **Nhánh B - FE/runtime contract**
- Làm `pass demo`, `runtime state`, `provider/mode`, `context`, `sidebar`, `popup`.
- Mục tiêu: UI không còn nói khác backend.
- **Nhánh C - Agent quality**
- Làm `follow-up triage`, `fallback phrasing`, `CTA timing`.
- Mục tiêu: cải thiện chất lượng trình diễn sau khi hệ thống đã ổn.

**Tiêu Chí PASS Cho Mỗi Cụm**
- `Boot/runtime`: chạy `1 bat` là lên được CPU local, ngrok public, frontend; `graph.status` trả `connected=true`.
- `Graph`: live `graph.status` không còn `404`; `graph.evidence` trả entities; `graph_injected=true` ở ca có thực thể phù hợp.
- `Demo pass`: `1234567` hoặc `INTERNAL_DEMO_PASS` mở được demo mode trên live; `live/access` không còn `403 Invalid pass`.
- `UI sync`: badge, context, sidebar cùng một truth; không còn `db ok` nhưng `không kết nối được`.
- `Demo flow`: không bị popup key/pass chặn ở ca nội bộ; `Xem context` mở được.
- `Triage`: ca sốt nhẹ có follow-up y khoa đúng mạch; ca đau ngực luôn khuyên gọi `115`.

**Các File Nên Đụng Trước**
- `start_demo_ngrok.bat`
- `cpu_server/launcher/run.ps1`
- `cpu_server/launcher/run_cpu_server_ngrok.py`
- `medical-consultation-app/app/api/mcp/call/route.ts`
- `medical-consultation-app/app/api/agent-chat/route.ts`
- `medical-consultation-app/app/api/live/access/route.ts`
- `medical-consultation-app/app/api/llm-chat/route.ts`
- `medical-consultation-app/app/api/runtime/mode/route.ts`
- `medical-consultation-app/components/chat-interface.tsx`
- `medical-consultation-app/components/compute-toggle.tsx`
- `cpu_server/langgraph_agent/graph.py`
- `cpu_server/langgraph_agent/runtime.py`

**Kế Hoạch 3 Ngày Thực Dụng**
- **Ngày 1**
- Khóa `Phase 0-3`: boot/runtime, graph URL, pass demo.
- Deploy lại live sau khi smoke local pass.
- **Ngày 2**
- Khóa `Phase 4-5`: UI state sync, sidebar, popup/context.
- Browser test lại trên live cho 2 ca demo chính.
- **Ngày 3**
- Khóa `Phase 6-7`: follow-up triage, FOZA timeout, quyết định GPU/registry.
- Chốt báo cáo PASS/FAIL theo `SYSTEM_TEST_PLAN`.

**Khuyến Nghị Thực Thi Ngay**
- Nếu muốn hiệu quả nhất, vòng sửa kế tiếp nên chỉ tập trung 4 việc: `graph live`, `internal pass`, `runtime state`, `popup demo`.
- Chỉ sau khi 4 việc này xanh mới tiếp tục sửa `follow-up triage`; nếu làm ngược sẽ rất khó phân biệt lỗi sản phẩm với lỗi hạ tầng.

- Tóm tắt ngắn: P0 đã có nền nhưng chưa hoàn tất nghiệm thu; kế hoạch đúng là khóa lại `runtime/graph/pass/UI truth` trước, rồi mới sửa chất lượng triage và mở rộng GPU.
- Tổng kích thước ngữ cảnh: — ~16k token.