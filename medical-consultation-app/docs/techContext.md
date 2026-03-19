## Agent providers

- Gemini API: dùng native tool/function calling (generateContent + functionDeclarations).
- Local LLM: dùng OpenAI-compatible `/v1/chat/completions`, ép output JSON `{response, actions}`, bật bằng `AGENT_PROVIDER=local`.
