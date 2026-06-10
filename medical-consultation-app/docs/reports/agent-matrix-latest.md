# Agent Matrix Report

- started_at: 2026-05-27T21:38:38
- target: cpu
- base_url: http://127.0.0.1:8000
- provider: foza
- agent_id: auto
- include_tools: True
- pass_rate: 100% (6/6)

| expected | got | ok | latency_ms | actions | tool_calls |
|---|---|---:|---:|---:|---|
| default | default | 1 | 6898 | 0 |  |
| triage | triage | 1 | 15000 | 1 |  |
| medication | medication | 1 | 22271 | 1 |  |
| care_plan | care_plan | 1 | 37922 | 1 |  |
| therapy | therapy | 1 | 26066 | 1 |  |
| doctor_referral | doctor_referral | 1 | 4784 | 1 | web.search |

## Intent snapshots

- default: {"wants_doctor":false,"wants_triage":false,"wants_medication":false,"wants_plan":false,"wants_therapy":false,"wants_graph":false,"wants_tools":false}
- triage: {"wants_doctor":false,"wants_triage":true,"wants_medication":false,"wants_plan":false,"wants_therapy":false,"wants_graph":false,"wants_tools":false}
- medication: {"wants_doctor":false,"wants_triage":false,"wants_medication":true,"wants_plan":false,"wants_therapy":false,"wants_graph":false,"wants_tools":false}
- care_plan: {"wants_doctor":false,"wants_triage":false,"wants_medication":false,"wants_plan":true,"wants_therapy":false,"wants_graph":false,"wants_tools":false}
- therapy: {"wants_doctor":false,"wants_triage":false,"wants_medication":true,"wants_plan":false,"wants_therapy":true,"wants_graph":false,"wants_tools":false}
- doctor_referral: {"wants_doctor":true,"wants_triage":false,"wants_medication":false,"wants_plan":false,"wants_therapy":false,"wants_graph":false,"wants_tools":true}
