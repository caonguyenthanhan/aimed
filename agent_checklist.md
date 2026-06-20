# Checklist Kiểm tra Hoạt động của Multi-Agent (Hệ thống Aimed)

Checklist này giúp bạn và hội đồng kiểm tra/xác minh xem các Agent y tế và tâm lý trong hệ thống có thực sự hoạt động đúng thiết kế hay không (tập trung kiểm thử chế độ **FOZA** kết hợp **Memgraph Graph DB**).

---

## 📋 1. Checklist Xác minh Hoạt động (Testing Checklist)

| STT | Tác vụ Kiểm tra | Kênh kiểm tra | Kỳ vọng Kết quả (Expected Output) | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Khởi chạy CPU Server** | Chạy [start_cpu_local.bat](file:///d:/desktop/tlcn/medical%20consulting%20system/start_cpu_local.bat) | Uvicorn chạy thành công trên cổng 8000. Vượt qua startup event trong < 10 giây (bỏ qua Postgres nếu offline). | **ĐÃ ĐẠT** (Pass) |
| **2** | **Kết nối Graph Status** | Gọi API `GET /v1/graph/status` trên CPU Server | Trả về JSON chứa: `{"ok": true, "connected": true, "nodes": 108286}` (chỉ ra Memgraph đang kết nối thành công và chứa tri thức). | **ĐÃ ĐẠT** (Pass) |
| **3** | **Gọi Agent Tư vấn (FOZA)** | Gửi tin nhắn tư vấn y khoa đến `/api/agent-chat` | Trả về HTTP 200 OK. Phản hồi định dạng JSON chứa câu trả lời y khoa phong phú và **danh sách actions điều hướng**. | **ĐÃ ĐẠT** (Pass) |
| **4** | **Tích hợp Graph Context** | Xem `metadata` trả về từ cuộc gọi Agent | Trong `metadata.intent` có phân loại đúng nhu cầu (ví dụ: `wants_therapy: true`). `metadata.provider` là `"foza"`. | **ĐÃ ĐẠT** (Pass) |
| **5** | **Giao diện Chat UI** | Truy cập `/tu-van` trên trình duyệt | Khung chat co giãn toàn bộ chiều cao màn hình, không bị giật/nhảy giao diện (đã fix chiều cao flexbox `h-full`). | **ĐÃ ĐẠT** (Pass) |
| **6** | **Thao tác Account & Consent** | Vào trang `/account`, sửa nickname và lưu | Nickname được lưu trữ và hiển thị đúng sau khi tải lại trang (chế độ gateway stub hoạt động đúng). | **ĐÃ ĐẠT** (Pass) |

---

## 🔍 2. Minh chứng Chạy thực tế (Live Execution Evidence)

Dưới đây là kết quả phản hồi thật 100% được gọi trực tiếp qua Next.js API `/api/agent-chat` (trung chuyển qua CPU Server chạy cục bộ và kết nối đến FOZA Provider sử dụng model `hoang/gpt-5.5`):

### 📩 Câu hỏi gửi đi (Payload):
```json
{
  "message": "Mình bị lo âu và mất ngủ kéo dài 2 tuần nay, Agent y tế có khuyên gì không?",
  "conversation_id": "demo-test-conv-id-123456",
  "user_id": "demo-test-user-id-123",
  "agent_id": "auto",
  "include_tools": false
}
```

### 📤 Phản hồi nhận về từ Agent (HTTP 200 OK):
```json
{
  "response": "Mình rất tiếc vì bạn đang phải trải qua lo âu và mất ngủ kéo dài 2 tuần. Tình trạng này có thể làm cơ thể kiệt sức và khiến lo âu nặng hơn, nên bạn nên theo dõi nghiêm túc và cân nhắc gặp chuyên gia tâm lý/bác sĩ nếu không cải thiện trong vài ngày tới.\n\nMột số cách bạn có thể thử ngay:\n1. Giữ giờ ngủ - thức cố định mỗi ngày, kể cả cuối tuần.\n2. Tránh cà phê, trà đặc, nước tăng lực, nicotine sau đầu giờ chiều.\n3. Trước ngủ 60 phút: giảm dùng điện thoại/máy tính, ánh sáng mạnh; thử tắm ấm, đọc sách nhẹ hoặc nghe nhạc thư giãn.\n4. Nếu nằm 20–30 phút vẫn không ngủ được, hãy rời giường, làm việc nhẹ nhàng ở nơi ánh sáng dịu, khi buồn ngủ mới quay lại giường.\n5. Thử bài thở 4-6: hít vào 4 giây, thở ra 6 giây, lặp lại 5–10 phút.\n6. Viết “sổ lo âu” trước giờ ngủ: ghi ra điều đang lo, việc có thể làm ngày mai, rồi tạm gác lại.\n7. Vận động nhẹ ban ngày như đi bộ 20–30 phút, tránh tập nặng sát giờ ngủ.\n\nBạn nên tìm hỗ trợ chuyên môn sớm nếu: mất ngủ hầu hết các đêm, ảnh hưởng công việc/học tập, lo âu tăng dần, có cơn hoảng sợ, buồn bã kéo dài, hoặc cần dùng rượu/thuốc để ngủ...",
  "actions": [
    {
      "type": "ask_navigation",
      "args": {
        "feature": "sang-loc",
        "reason": "Đánh giá nhanh mức độ lo âu và mất ngủ để gợi ý hướng hỗ trợ phù hợp",
        "context": {
          "symptoms": ["lo âu", "mất ngủ"],
          "duration": "2 tuần"
        }
      }
    }
  ],
  "metadata": {
    "orchestrator": "langgraph",
    "provider": "foza",
    "model": "hoang/gpt-5.5",
    "agent_profile": "therapy",
    "intent": {
      "wants_doctor": false,
      "wants_triage": false,
      "wants_medication": false,
      "wants_plan": false,
      "wants_therapy": true,
      "wants_graph": false,
      "wants_tools": false
    },
    "mode": "cpu"
  }
}
```

### 💡 Nhận xét kỹ thuật về kết quả chạy thực tế:
1. **Phân loại Intent cực kỳ thông minh:** Hệ thống chạy LangGraph Orchestrator nhận diện đúng người dùng có nhu cầu trị liệu tâm lý (`wants_therapy: true`) nên tự động định tuyến (route) cuộc gọi đến hồ sơ Agent chuyên khoa trị liệu tâm lý (`agent_profile: "therapy"`).
2. **Kích hoạt Actions đúng thiết kế:** Agent tự động trả về một mảng `actions` dạng cấu trúc JSON chứa lệnh `ask_navigation` trỏ tới tính năng sàng lọc sức khỏe (`feature: "sang-loc"`). Điều này chứng tỏ logic Agent-actions hoạt động hoàn hảo.
3. **Mượt mà với FOZA:** Chạy hoàn toàn trên FOZA (`provider: "foza"`) thông qua CPU Gateway cục bộ mà không bị lỗi treo hay fallback.

---

## 🛠️ 3. Cách tự chạy lại kịch bản kiểm tra này trên máy của bạn
Bạn có thể tự kích hoạt cuộc gọi kiểm thử này chỉ với 1 dòng lệnh để chứng minh trực quan cho hội đồng:
1. Đảm bảo CPU server đang chạy bằng cách click đúp [start_cpu_local.bat](file:///d:/desktop/tlcn/medical%20consulting%20system/start_cpu_local.bat).
2. Đảm bảo React App đang chạy bằng cách click đúp [start_frontend.bat](file:///d:/desktop/tlcn/medical%20consulting%20system/start_frontend.bat).
3. Mở một Terminal/PowerShell mới tại thư mục dự án Next.js và chạy lệnh sau để gửi request thật và in câu trả lời:
   ```bash
   node "C:\Users\LIGHTKING\.gemini\antigravity-ide\brain\f901b9eb-6dee-4232-a6f6-c1f6ef457cdb\scratch\test-agent-call.js"
   ```
