import { POST } from "../../app/api/agent-chat/route"

const runIntegration = String(process.env.RUN_LLM_INTEGRATION_TESTS || "").trim() === "1"
const describeIntegration = runIntegration ? describe : describe.skip

describeIntegration("Agent LLM E2E (real providers)", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.AGENT_FORCE_ACTIONS = "0"
    process.env.AGENT_HYDRATE_YOUTUBE = "0"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it(
    "Gemini: default consultation returns valid schema without fallback",
    async () => {
      const hasGeminiKey = !!String(process.env.GEMINI_API_KEY || "").trim()
      if (!hasGeminiKey) return

      const req = new Request("http://localhost/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Trả lời ngắn gọn 1 câu. Không cần hành động.",
          agent_id: "default",
          provider: "gemini",
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()

      expect(typeof json?.response).toBe("string")
      expect(json.response.length).toBeGreaterThan(0)
      expect(Array.isArray(json?.actions)).toBe(true)
      expect(json?.metadata?.provider).toBe("gemini")
      expect(json?.metadata?.agent_profile).toBe("default")
      expect(["missing_gemini_key", "rule_based"]).not.toContain(json?.metadata?.fallback)
    },
    60000
  )

  it(
    "FOZA: therapy returns valid schema without fallback",
    async () => {
      const hasFozaToken = !!String(process.env.FOZA_TOKEN || "").trim()
      const hasFozaModel = !!String(process.env.LLM_MODEL_NAME || "").trim()
      if (!hasFozaToken || !hasFozaModel) return

      const req = new Request("http://localhost/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Tôi hơi lo âu. Hãy hướng dẫn 1 kỹ thuật thở ngắn. Không cần hành động.",
          agent_id: "therapy",
          provider: "foza",
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()

      expect(typeof json?.response).toBe("string")
      expect(json.response.length).toBeGreaterThan(0)
      expect(Array.isArray(json?.actions)).toBe(true)
      expect(json?.metadata?.provider).toBe("foza")
      expect(json?.metadata?.agent_profile).toBe("therapy")
      expect(["missing_gemini_key", "rule_based"]).not.toContain(json?.metadata?.fallback)
    },
    60000
  )
})
