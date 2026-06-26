/**
 * Tests for semantic-router.ts (embeddings & cosine similarity)
 */
import { semanticRoute, detectIntentFlags, inferAgentProfileId, SPECIALTY_DESCRIPTIONS } from "../semantic-router"

describe("SPECIALTY_DESCRIPTIONS integrity", () => {
  it("has 6 profiles", () => {
    expect(Object.keys(SPECIALTY_DESCRIPTIONS)).toHaveLength(6)
  })

  it("each profile description is non-empty string", () => {
    for (const [id, desc] of Object.entries(SPECIALTY_DESCRIPTIONS)) {
      expect(typeof id).toBe("string")
      expect(typeof desc).toBe("string")
      expect(desc.length).toBeGreaterThan(0)
    }
  })
})

describe("semanticRoute()", () => {
  describe("profile selection by message content", () => {
    const cases: [string, string, string][] = [
      ["Tôi bị đau ngực và khó thở, cần cấp cứu", "triage", "emergency keywords"],
      ["Tôi muốn đặt hẹn khám bác sĩ tim mạch", "doctor_referral", "appointment intent"],
      ["Tôi lo âu và mất ngủ nhiều ngày", "therapy", "mental health keywords"],
      ["Ibuprofen có tương tác với paracetamol không?", "medication", "drug name"],
      ["Tôi muốn lập kế hoạch giảm cân", "care_plan", "planning intent"],
      ["Xin chào, tôi cần tư vấn sức khỏe", "default", "general query"],
    ]

    for (const [message, expectedProfile, description] of cases) {
      it(`routes "${description}" → ${expectedProfile}`, async () => {
        const result = await semanticRoute(message)
        expect(result.profileId).toBe(expectedProfile)
        expect(result.source).toBe("semantic_router_v2")
      })
    }
  })

  describe("triage gets highest priority on emergency", () => {
    it("emergency message → confidence high", async () => {
      const result = await semanticRoute("Tôi bị co giật và ngất xỉu cấp cứu")
      expect(result.confidence).toBe("high")
    })

    it("returns all 6 profiles in scores array", async () => {
      const result = await semanticRoute("Tôi bị đau đầu")
      const profileIds = result.scores.map((s) => s.profileId)
      expect(profileIds).toContain("triage")
      expect(profileIds).toContain("therapy")
      expect(profileIds).toContain("medication")
      expect(profileIds).toContain("care_plan")
      expect(profileIds).toContain("doctor_referral")
      expect(profileIds).toContain("default")
    })
  })

  describe("Vietnamese text handling", () => {
    it("handles text without diacritics", async () => {
      const result = await semanticRoute("toi lo au va mat ngu nhieu ngay")
      expect(result.profileId).toBe("therapy")
    })

    it("handles mixed diacritics/no-diacritics", async () => {
      const result = await semanticRoute("thuoc ibuprofen co tuong tac khong?")
      expect(result.profileId).toBe("medication")
    })

    it("handles empty message gracefully", async () => {
      const result = await semanticRoute("")
      expect(result.profileId).toBe("default")
      expect(result.confidence).toBe("low")
    })
  })
})

describe("detectIntentFlags()", () => {
  it("detects triage flag for emergency keywords", async () => {
    const flags = await detectIntentFlags("đau ngực và khó thở")
    expect(flags.triage).toBe(true)
    expect(flags.source).toBe("semantic_router_v2")
  })

  it("detects therapy flag for mental health keywords", async () => {
    const flags = await detectIntentFlags("tôi bị trầm cảm và lo âu")
    expect(flags.therapy).toBe(true)
  })

  it("detects medication flag for drug names", async () => {
    const flags = await detectIntentFlags("ibuprofen có tác dụng phụ gì?")
    expect(flags.medication).toBe(true)
  })

  it("detects plan flag for planning keywords", async () => {
    const flags = await detectIntentFlags("tôi muốn lập kế hoạch tập luyện")
    expect(flags.plan).toBe(true)
  })

  it("detects doctor flag for appointment keywords", async () => {
    const flags = await detectIntentFlags("tôi muốn đặt hẹn khám bác sĩ")
    expect(flags.doctor).toBe(true)
  })

  it("detects wantsGraph for graph/evidence keywords", async () => {
    const flags = await detectIntentFlags("có graph evidence về bệnh này không?")
    expect(flags.wantsGraph).toBe(true)
  })

  it("all flags false for unrelated message", async () => {
    const flags = await detectIntentFlags("thời tiết hôm nay thế nào?")
    expect(flags.triage).toBe(false)
    expect(flags.therapy).toBe(false)
    expect(flags.medication).toBe(false)
    expect(flags.plan).toBe(false)
    expect(flags.doctor).toBe(false)
  })
})

describe("inferAgentProfileId() — backward compat", () => {
  it("returns AgentProfileId string", async () => {
    const result = await inferAgentProfileId("tôi lo âu mất ngủ")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("therapy profile for anxiety message", async () => {
    expect(await inferAgentProfileId("Tôi lo âu và mất ngủ")).toBe("therapy")
  })

  it("medication for drug query", async () => {
    expect(await inferAgentProfileId("Thuốc ibuprofen có tương tác gì không?")).toBe("medication")
  })

  it("care_plan for planning query", async () => {
    expect(await inferAgentProfileId("Tôi muốn lập kế hoạch giảm cân")).toBe("care_plan")
  })

  it("default for generic query", async () => {
    expect(await inferAgentProfileId("Xin chào")).toBe("default")
  })

  it("triage for emergency", async () => {
    expect(await inferAgentProfileId("Tôi bị đau ngực dữ dội")).toBe("triage")
  })

  it("doctor_referral for appointment", async () => {
    expect(await inferAgentProfileId("Tôi muốn đặt hẹn khám bác sĩ")).toBe("doctor_referral")
  })
})
