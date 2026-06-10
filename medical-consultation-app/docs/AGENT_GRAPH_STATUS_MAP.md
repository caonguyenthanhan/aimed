# Bản đồ Agent/Graph (trạng thái hiện tại)

Tài liệu này dùng để theo dõi nhanh “nhánh agent” (agent profiles) và mức độ hoạt động của Graph trong local demo.

## Luồng tổng thể

```mermaid
flowchart TD
  UI[UI /tu-van (Agent mode)] -->|POST /api/agent-chat<br/>provider=foza, agent_id=auto| GW[Gateway Agent (Next.js)]
  GW -->|proxy CPU /v1/agent-chat| CPU[CPU LangGraph Orchestrator]
  CPU -->|FOZA /chat/completions| FOZA[FOZA (model=hoang/gpt-5.5)]
  CPU -->|Tools (khi include_tools=true)| MCP[MCP-lite tools]
  MCP -->|graph.status / graph.evidence| GRAPH[Memgraph (bolt://127.0.0.1:7687)]

  CPU --> OUT[{response, actions, metadata}]
  OUT --> UI

  subgraph Profiles[Agent Profiles (agent_id=auto)]
    P0[default]
    P1[triage]
    P2[medication]
    P3[care_plan]
    P4[therapy]
    P5[doctor_referral]
  end

  GW --> Profiles
```

## Ma trận nhánh agent (FOZA)

Thang mức độ:
- 0 = chưa có
- 1 = chạy được
- 2 = đúng nhánh
- 3 = có actions/graph tốt
- 4 = hoàn thiện UI end-to-end

| Nhánh agent | Prompt kích hoạt (ngữ nghĩa) | Kết quả hiện tại | Actions | Mức độ |
|---|---|---:|---:|---:|
| default | câu hỏi chung | metadata.agent_profile=default | 0 | 2 |
| triage | “đau ngực + khó thở” | metadata.agent_profile=triage | 2 | 3 |
| medication | “ibuprofen + paracetamol” | metadata.agent_profile=medication | 0 | 2 |
| care_plan | “lập kế hoạch theo dõi huyết áp 2 tuần” | metadata.agent_profile=care_plan | 1 | 3 |
| therapy | “lo âu + mất ngủ, hướng dẫn bài thở” | metadata.agent_profile=therapy | 1 | 3 |
| doctor_referral | “muốn đặt hẹn bác sĩ tim mạch” | metadata.agent_profile=doctor_referral | 1 | 3 |

## Graph (mức độ hiện tại)

- Kết nối: `graph.status connected=true`
- Dữ liệu: `nodes>0` (đã import graph dump; hiện ~216k nodes)
- Evidence: `graph.evidence` trả về `entities[]` + `edges[]` (ưu tiên `collection=demo` để demo dễ đọc)

## Cách cập nhật định kỳ

- Re-run ma trận test (6 prompt) và cập nhật lại cột “Kết quả hiện tại/Actions/Mức độ”.
- Khi ingest dữ liệu Graph: cập nhật `nodes`, và đánh dấu các case có `graph.evidence` trả về entities/edges thực sự.
