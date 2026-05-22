import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { POST } from "../../app/api/agent-chat/route"

describe("Agent profiles fallback (rule-based)", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GEMINI_API_KEY
    delete process.env.FOZA_TOKEN
    process.env.AGENT_PROVIDER = "gemini"
    process.env.LLM_PROVIDER = "gemini"
    process.env.AGENT_GRAPH_EVIDENCE = "0"
    process.env.CPU_SERVER_URL = "http://127.0.0.1:8000"
    process.env.GPU_SERVER_URL = "http://127.0.0.1:8001"
    vi.restoreAllMocks()
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network_disabled_for_unit_test")
    }) as any)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("consultation agent (default) should suggest opening doctor feature on red flags", async () => {
    const req = new Request("http://localhost/api/agent-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Tôi bị đau ngực và khó thở",
        agent_id: "default",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("default")
    if (json?.metadata?.fallback) {
      expect(["missing_gemini_key", "rule_based", "missing_provider_key"]).toContain(json?.metadata?.fallback)
    }
    expect(Array.isArray(json?.actions)).toBe(true)
    expect(json.actions[0]?.type).toBe("ask_navigation")
    expect(json.actions[0]?.args?.feature).toBe("bac-si")
  })

  it("therapy agent should suggest opening tri-lieu even when message mentions anxiety", async () => {
    const req = new Request("http://localhost/api/agent-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Tôi lo âu và mất ngủ nhiều ngày",
        agent_id: "therapy",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("therapy")
    if (json?.metadata?.fallback) {
      expect(["missing_gemini_key", "rule_based", "missing_provider_key"]).toContain(json?.metadata?.fallback)
    }
    expect(Array.isArray(json?.actions)).toBe(true)
    expect(json.actions[0]?.type).toBe("ask_navigation")
    expect(json.actions[0]?.args?.feature).toBe("tri-lieu")
  })
})
