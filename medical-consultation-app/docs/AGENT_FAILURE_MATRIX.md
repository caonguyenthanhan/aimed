# Agent Failure Matrix

## Biến số

- Provider: `AGENT_PROVIDER=gemini|local`
- Key: `GEMINI_API_KEY` (system) / `access_pass` (user key)
- Rate limit: 429 / RESOURCE_EXHAUSTED
- Delivery: `delivery_mode=chunked|live`
- Actions: `navigate|embed|ask_navigation|recommend_music|play_music|speak`

## Case chính (kỳ vọng)

| Case | Điều kiện | Kỳ vọng response | Kỳ vọng actions | Kỳ vọng metadata |
|---|---|---|---|---|
| G1 | gemini + có key | Trả lời bình thường | Actions hợp lệ theo allowlist | `mode=gpu`, `provider=gemini` |
| G2 | gemini + thiếu key | Fallback rule-based | `navigate` (nếu match) hoặc `[]` | `mode=cpu`, `fallback=missing_gemini_key` |
| G3 | gemini + 429 | Báo chờ / nhập key | `[]` | `mode=cpu`, `rate_limited=true` |
| L1 | local + endpoint OK | Trả từ JSON local | Actions hợp lệ theo allowlist | `mode=cpu`, `provider=local`, `parsed_json=true|false` |
| L2 | local + endpoint lỗi | Fallback rule-based | `navigate` (nếu match) hoặc `[]` | `fallback=rule_based` |

## Điểm kiểm tra nhanh

- Allowlist SSOT: `ALLOWED_PATH_PREFIXES` phải bao phủ các route được phép navigate.
- Forced actions: chỉ bật khi cần debug (`AGENT_FORCE_ACTIONS=1`).
- YouTube hydrate: bật mặc định, tắt bằng `AGENT_HYDRATE_YOUTUBE=0`.

