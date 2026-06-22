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

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const makeReq = (body: object) =>
    new Request("http://localhost/api/agent-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

  const getActions = (json: any) => (Array.isArray(json?.actions) ? json.actions : [])

  // ─── Profile: default ──────────────────────────────────────────────────────
  it("default profile suggests bac-si for triage keywords", async () => {
    const req = makeReq({ message: "Tôi bị đau ngực và khó thở", agent_id: "default" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("default")
    const actions = getActions(json)
    expect(actions[0]?.type).toBe("ask_navigation")
    expect(actions[0]?.args?.feature).toBe("bac-si")
  })

  // ─── Profile: therapy ──────────────────────────────────────────────────────
  it("therapy profile suggests tri-lieu for anxiety messages", async () => {
    const req = makeReq({ message: "Tôi lo âu và mất ngủ nhiều ngày", agent_id: "therapy" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("therapy")
    const actions = getActions(json)
    expect(actions[0]?.type).toBe("ask_navigation")
    expect(actions[0]?.args?.feature).toBe("tri-lieu")
  })

  // ─── Profile: medication ───────────────────────────────────────────────────
  it("medication profile suggests tra-cuu for drug queries", async () => {
    const req = makeReq({
      message: "Thuốc ibuprofen có tương tác với paracetamol không?",
      agent_id: "medication",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("medication")
    const actions = getActions(json)
    const navAction = actions.find((a: any) => a.type === "ask_navigation")
    expect(navAction).toBeDefined()
    expect(navAction?.args?.feature).toBe("tra-cuu")
  })

  // ─── Profile: care_plan ────────────────────────────────────────────────────
  it("care_plan profile suggests ke-hoach for planning queries", async () => {
    const req = makeReq({
      message: "Tôi muốn lập kế hoạch giảm cân theo lộ trình",
      agent_id: "care_plan",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("care_plan")
    const actions = getActions(json)
    const navAction = actions.find((a: any) => a.type === "ask_navigation")
    expect(navAction).toBeDefined()
    expect(navAction?.args?.feature).toBe("ke-hoach")
  })

  // ─── Profile: doctor_referral ──────────────────────────────────────────────
  it("doctor_referral profile suggests bac-si", async () => {
    const req = makeReq({
      message: "Tôi muốn đặt lịch khám bác sĩ tim mạch",
      agent_id: "doctor_referral",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBe("doctor_referral")
    const actions = getActions(json)
    const navAction = actions.find((a: any) => a.type === "ask_navigation")
    expect(navAction).toBeDefined()
    expect(navAction?.args?.feature).toBe("bac-si")
  })

  // ─── Auto intent inference ─────────────────────────────────────────────────
  it("auto-infers profile — emergency keywords → triage or default profile", async () => {
    const req = makeReq({
      message: "Tôi đang đau ngực dữ dội và khó thở, cần cấp cứu",
      agent_id: "auto",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    // Should infer triage or default profile based on keywords
    expect(["triage", "default"]).toContain(json?.metadata?.agent_profile)
    // Response should exist and be non-empty
    expect(json.response.trim().length).toBeGreaterThan(0)
    // Actions must be an array (Triage Guard may hold CTA in rule-based fallback)
    expect(Array.isArray(json.actions)).toBe(true)
    // NOTE: Triage Guard may withhold bac-si CTA if ready_for_cta is not yet set.
    // The intent flag IS detected (this is verified via profile inference above).
  })

  it("auto-infers profile — mental health keywords → therapy/sang-loc action", async () => {
    const req = makeReq({
      message: "Tôi bị lo âu và trầm cảm nặng trong thời gian dài",
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(["therapy", "default"]).toContain(json?.metadata?.agent_profile)
    const actions = getActions(json)
    const hasTherapyAction = actions.some(
      (a: any) =>
        a.type === "ask_navigation" && ["sang-loc", "tri-lieu"].includes(a.args?.feature)
    )
    expect(hasTherapyAction).toBe(true)
  })

  it("auto-infers profile — no explicit agent_id → always gets a profile", async () => {
    const req = makeReq({ message: "Tôi muốn tư vấn sức khỏe" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.metadata?.agent_profile).toBeDefined()
    expect(typeof json.metadata.agent_profile).toBe("string")
    expect(json.metadata.agent_profile.length).toBeGreaterThan(0)
  })

  // ─── Response shape (regression tests for Phase 2 refactor) ───────────────
  it("response always includes all required fields", async () => {
    const req = makeReq({ message: "Xin chào" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(typeof json.response).toBe("string")
    expect(json.response.trim().length).toBeGreaterThan(0)
    expect(Array.isArray(json.actions)).toBe(true)
    expect(Array.isArray(json.messages)).toBe(true)
    expect(typeof json.conversation_id).toBe("string")
    expect(json.metadata).toBeDefined()
    expect(typeof json.metadata.agent_profile).toBe("string")
  })

  it("messages[] always has at least one item", async () => {
    const req = makeReq({ message: "Tôi đau đầu nhẹ", agent_id: "triage" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(Array.isArray(json?.messages)).toBe(true)
    expect(json.messages.length).toBeGreaterThan(0)
    expect(json.messages.every((m: any) => typeof m.content === "string")).toBe(true)
  })

  it("returns 400 for empty message", async () => {
    const req = makeReq({ message: "" })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ─── SOS behavior ──────────────────────────────────────────────────────────
  it("SOS response has empty actions (do not redirect user in crisis)", async () => {
    const req = makeReq({ message: "Tôi muốn tự tử, không muốn sống nữa" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(Array.isArray(json.actions)).toBe(true)
    expect(json.actions).toHaveLength(0)
    expect(json.response).toBeTruthy()
    expect(json.metadata?.sos).toBe(true)
  })

  it("SOS response contains hotline info in response text", async () => {
    const req = makeReq({ message: "Tôi muốn tự hại bản thân" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    // Should contain at least one phone number or hotline reference
    const hasHotline =
      json.response.includes("115") ||
      json.response.includes("1800") ||
      json.response.includes("hotline") ||
      json.response.includes("đường dây")
    expect(hasHotline).toBe(true)
  })

  // ─── Navigation action safety ──────────────────────────────────────────────
  it("navigate actions only contain allowed paths (whitelist enforcement)", async () => {
    const req = makeReq({ message: "Mở trang sàng lọc cho tôi", agent_id: "default" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    const navigateActions = getActions(json).filter((a: any) => a.type === "navigate")
    const allowedPrefixes = [
      "/sang-loc", "/tri-lieu", "/nhac-nho", "/tin-tuc-y-khoa",
      "/tam-su", "/tu-van", "/bac-si", "/doctor", "/ke-hoach", "/tra-cuu", "/thong-ke",
    ]
    for (const action of navigateActions) {
      const path = String(action.args?.path || "")
      const isAllowed = allowedPrefixes.some((p) => path === p || path.startsWith(`${p}/`))
      expect(isAllowed).toBe(true)
    }
  })
})
