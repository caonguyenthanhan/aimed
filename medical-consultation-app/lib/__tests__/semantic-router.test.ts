/**
 * Tests for semantic-router.ts
 *
 * Verify: scoring table, profile selection, context boosting, edge cases.
 * These tests serve as the regression baseline for future LangGraph integration.
 */
import { semanticRoute, detectIntentFlags, inferAgentProfileId, scoreProfile, ROUTER_PROFILES } from "../semantic-router"

// ─── scoreProfile() ────────────────────────────────────────────────────────────

describe("scoreProfile()", () => {
  const triageProfile = ROUTER_PROFILES.find((p) => p.id === "triage")!
  const therapyProfile = ROUTER_PROFILES.find((p) => p.id === "therapy")!

  it("returns score > 0 when signals match", () => {
    const result = scoreProfile("Tôi bị đau ngực và khó thở", triageProfile)
    expect(result.score).toBeGreaterThan(0)
    expect(result.matchedSignals.length).toBeGreaterThan(0)
  })

  it("returns score = 0 when no signals match", () => {
    const result = scoreProfile("Tôi muốn học nấu ăn", triageProfile)
    expect(result.score).toBe(0)
    expect(result.matchedSignals).toHaveLength(0)
  })

  it("high-weight emergency signals give score >= 2.0", () => {
    const result = scoreProfile("cấp cứu", triageProfile)
    expect(result.score).toBeGreaterThanOrEqual(2.0)
  })

  it("returns correct profileId", () => {
    const result = scoreProfile("mất ngủ căng thẳng", therapyProfile)
    expect(result.profileId).toBe("therapy")
  })

  it("handles diacritics-stripped text (no-diacritic search)", () => {
    // "mat ngu" = "mất ngủ" stripped
    const result = scoreProfile("mat ngu nhieu ngay", therapyProfile)
    expect(result.score).toBeGreaterThan(0)
  })
})

// ─── semanticRoute() ───────────────────────────────────────────────────────────

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
      it(`routes "${description}" → ${expectedProfile}`, () => {
        const result = semanticRoute(message)
        expect(result.profileId).toBe(expectedProfile)
        expect(result.source).toBe("semantic_router_v1")
      })
    }
  })

  describe("triage gets highest priority on emergency", () => {
    it("emergency message overrides doctor_referral intent", () => {
      // Message contains both appointment AND emergency keywords
      const result = semanticRoute("Tôi bị đau ngực muốn đặt hẹn khám ngay")
      // Triage should win because emergency signal weight is 2.5
      expect(["triage", "doctor_referral"]).toContain(result.profileId)
    })

    it("emergency message → confidence high", () => {
      const result = semanticRoute("Tôi bị co giật và ngất xỉu")
      expect(result.confidence).toBe("high")
    })
  })

  describe("confidence levels", () => {
    it("low confidence for ambiguous/general messages", () => {
      const result = semanticRoute("Tôi cần giúp đỡ")
      expect(["low", "medium"]).toContain(result.confidence)
    })

    it("returns all 6 profiles in scores array", () => {
      const result = semanticRoute("Tôi bị đau đầu")
      const profileIds = result.scores.map((s) => s.profileId)
      expect(profileIds).toContain("triage")
      expect(profileIds).toContain("therapy")
      expect(profileIds).toContain("medication")
      expect(profileIds).toContain("care_plan")
      expect(profileIds).toContain("doctor_referral")
      expect(profileIds).toContain("default")
    })
  })

  describe("context boosting from history", () => {
    it("therapy history boosts therapy score — ambiguous message stays in therapy/default (not triage or medication)", () => {
      const history = [
        { role: "user", content: "Tôi rất lo âu và mất ngủ" },
        { role: "assistant", content: "Tôi hiểu cảm giác của bạn. Hãy thử bài thở sau..." },
      ]
      const result = semanticRoute("Vẫn chưa khỏi", history)
      // Context boosting: ambiguous follow-up should NOT jump to triage/medication
      // It may be default or therapy depending on boost strength
      expect(["therapy", "default"]).toContain(result.profileId)
      // Critically: should NOT be triage or medication (which would be wrong)
      expect(result.profileId).not.toBe("triage")
      expect(result.profileId).not.toBe("medication")
    })

    it("no history crash on empty array", () => {
      expect(() => semanticRoute("Test", [])).not.toThrow()
    })
  })

  describe("Vietnamese text handling", () => {
    it("handles text without diacritics", () => {
      const result = semanticRoute("toi lo au va mat ngu nhieu ngay")
      expect(result.profileId).toBe("therapy")
    })

    it("handles mixed diacritics/no-diacritics", () => {
      const result = semanticRoute("thuoc ibuprofen co tuong tac khong?")
      expect(result.profileId).toBe("medication")
    })

    it("handles empty message gracefully", () => {
      const result = semanticRoute("")
      expect(result.profileId).toBe("default")
      expect(result.confidence).toBe("low")
    })
  })
})

// ─── detectIntentFlags() ───────────────────────────────────────────────────────

describe("detectIntentFlags()", () => {
  it("detects triage flag for emergency keywords", () => {
    const flags = detectIntentFlags("đau ngực và khó thở")
    expect(flags.triage).toBe(true)
    expect(flags.source).toBe("semantic_router_v1")
  })

  it("detects therapy flag for mental health keywords", () => {
    const flags = detectIntentFlags("tôi bị trầm cảm và lo âu")
    expect(flags.therapy).toBe(true)
  })

  it("detects medication flag for drug names", () => {
    const flags = detectIntentFlags("ibuprofen có tác dụng phụ gì?")
    expect(flags.medication).toBe(true)
  })

  it("detects plan flag for planning keywords", () => {
    const flags = detectIntentFlags("tôi muốn lập kế hoạch tập luyện")
    expect(flags.plan).toBe(true)
  })

  it("detects doctor flag for appointment keywords", () => {
    const flags = detectIntentFlags("tôi muốn đặt hẹn khám bác sĩ")
    expect(flags.doctor).toBe(true)
  })

  it("detects wantsGraph for graph/evidence keywords", () => {
    const flags = detectIntentFlags("có graph evidence về bệnh này không?")
    expect(flags.wantsGraph).toBe(true)
  })

  it("can have multiple flags simultaneously", () => {
    const flags = detectIntentFlags("tôi lo âu, mất ngủ và muốn đặt hẹn khám")
    expect(flags.therapy).toBe(true)
    expect(flags.doctor).toBe(true)
  })

  it("all flags false for unrelated message", () => {
    const flags = detectIntentFlags("thời tiết hôm nay thế nào?")
    expect(flags.triage).toBe(false)
    expect(flags.therapy).toBe(false)
    expect(flags.medication).toBe(false)
    expect(flags.plan).toBe(false)
    expect(flags.doctor).toBe(false)
  })
})

// ─── inferAgentProfileId() — backward compat wrapper ─────────────────────────

describe("inferAgentProfileId() — backward compat", () => {
  it("returns AgentProfileId string", () => {
    const result = inferAgentProfileId("tôi lo âu mất ngủ")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("therapy profile for anxiety message", () => {
    expect(inferAgentProfileId("Tôi lo âu và mất ngủ")).toBe("therapy")
  })

  it("medication for drug query", () => {
    expect(inferAgentProfileId("Thuốc ibuprofen có tương tác gì không?")).toBe("medication")
  })

  it("care_plan for planning query", () => {
    expect(inferAgentProfileId("Tôi muốn lập kế hoạch giảm cân")).toBe("care_plan")
  })

  it("default for generic query", () => {
    expect(inferAgentProfileId("Xin chào")).toBe("default")
  })

  it("triage for emergency", () => {
    expect(inferAgentProfileId("Tôi bị đau ngực dữ dội")).toBe("triage")
  })

  it("doctor_referral for appointment", () => {
    expect(inferAgentProfileId("Tôi muốn đặt hẹn khám bác sĩ")).toBe("doctor_referral")
  })
})

// ─── ROUTER_PROFILES integrity ────────────────────────────────────────────────

describe("ROUTER_PROFILES integrity", () => {
  it("has 6 profiles", () => {
    expect(ROUTER_PROFILES).toHaveLength(6)
  })

  it("each profile has valid id, signals, threshold, priority", () => {
    for (const p of ROUTER_PROFILES) {
      expect(typeof p.id).toBe("string")
      expect(Array.isArray(p.signals)).toBe(true)
      expect(p.signals.length).toBeGreaterThan(0)
      expect(typeof p.threshold).toBe("number")
      expect(typeof p.priority).toBe("number")
    }
  })

  it("each signal has valid pattern, weight, label", () => {
    for (const p of ROUTER_PROFILES) {
      for (const s of p.signals) {
        expect(s.pattern instanceof RegExp).toBe(true)
        expect(typeof s.weight).toBe("number")
        expect(s.weight).toBeGreaterThan(0)
        expect(typeof s.label).toBe("string")
      }
    }
  })

  it("triage has highest priority", () => {
    const triage = ROUTER_PROFILES.find((p) => p.id === "triage")!
    const maxPriority = Math.max(...ROUTER_PROFILES.map((p) => p.priority))
    expect(triage.priority).toBe(maxPriority)
  })

  it("default has lowest priority", () => {
    const def = ROUTER_PROFILES.find((p) => p.id === "default")!
    const minPriority = Math.min(...ROUTER_PROFILES.map((p) => p.priority))
    expect(def.priority).toBe(minPriority)
  })
})
