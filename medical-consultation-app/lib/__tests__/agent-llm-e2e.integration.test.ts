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
      const hasFozaToken = !!String(process.env.FOZA_TOKEN || process.env.FOZA_TOKEN_2 || "").trim()
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

  it(
    "FOZA: profiles return valid schema (explicit agent_id)",
    async () => {
      const hasFozaToken = !!String(process.env.FOZA_TOKEN || process.env.FOZA_TOKEN_2 || "").trim()
      const hasFozaModel = !!String(process.env.LLM_MODEL_NAME || "").trim()
      if (!hasFozaToken || !hasFozaModel) return

      const cases: Array<{ agent_id: string; message: string }> = [
        { agent_id: "default", message: "Trả lời ngắn gọn 1 câu. Không cần hành động." },
        { agent_id: "medication", message: "Ibuprofen có tương tác với thuốc hạ huyết áp không? Không cần hành động." },
        { agent_id: "care_plan", message: "Lập kế hoạch 7 ngày theo dõi huyết áp tại nhà. Không cần hành động." },
        { agent_id: "triage", message: "Tôi đau ngực và khó thở. Hãy hỏi thêm và nhắc dấu hiệu nguy hiểm. Không cần hành động." },
        { agent_id: "doctor_referral", message: "Tôi muốn đặt hẹn bác sĩ. Không cần hành động." },
      ]

      for (const c of cases) {
        const req = new Request("http://localhost/api/agent-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: c.message,
            agent_id: c.agent_id,
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
        expect(json?.metadata?.agent_profile).toBe(c.agent_id)
        expect(["missing_gemini_key", "rule_based"]).not.toContain(json?.metadata?.fallback)
      }
    },
    120000
  )

  it(
    "FOZA: auto routing selects expected agent_profile",
    async () => {
      const hasFozaToken = !!String(process.env.FOZA_TOKEN || process.env.FOZA_TOKEN_2 || "").trim()
      const hasFozaModel = !!String(process.env.LLM_MODEL_NAME || "").trim()
      if (!hasFozaToken || !hasFozaModel) return

      const cases: Array<{ expected: string; message: string }> = [
        { expected: "medication", message: "Paracetamol liều bao nhiêu? Có tác dụng phụ gì?" },
        { expected: "care_plan", message: "Bạn giúp mình lập kế hoạch tập luyện 2 tuần để giảm cân." },
        { expected: "therapy", message: "Mình đang lo âu và mất ngủ, hướng dẫn 1 bài thở." },
        { expected: "triage", message: "Tôi đau ngực và khó thở, cần làm gì ngay?" },
        { expected: "doctor_referral", message: "Mình muốn đặt lịch khám với bác sĩ." },
      ]

      for (const c of cases) {
        const req = new Request("http://localhost/api/agent-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: c.message,
            agent_id: "auto",
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
        expect(json?.metadata?.agent_profile).toBe(c.expected)
        expect(["missing_gemini_key", "rule_based"]).not.toContain(json?.metadata?.fallback)
      }
    },
    120000
  )
})
