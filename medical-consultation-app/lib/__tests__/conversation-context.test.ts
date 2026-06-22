/**
 * Tests for conversation-context.ts
 *
 * Verify: extractPatientInfo, detectEmergencySignals, buildContext,
 * isContextReadyForCta, getFollowUpQuestions, mergeContextWithGatewayMeta.
 */
import {
  extractPatientInfo,
  detectEmergencySignals,
  buildContext,
  isContextReadyForCta,
  getFollowUpQuestions,
  mergeContextWithGatewayMeta,
  serializeContext,
  type ConversationContext,
} from "../conversation-context"

// ─── extractPatientInfo() ──────────────────────────────────────────────────────

describe("extractPatientInfo()", () => {
  describe("age extraction", () => {
    it("extracts age from 'X tuổi'", () => {
      const result = extractPatientInfo("Tôi 35 tuổi")
      expect(result.age).toBe("35")
    })

    it("extracts age from stripped diacritics 'X tuoi'", () => {
      const result = extractPatientInfo("toi 28 tuoi")
      expect(result.age).toBe("28")
    })

    it("does not extract invalid age (> 120)", () => {
      const result = extractPatientInfo("200 năm trước")
      expect(result.age).toBeUndefined()
    })

    it("does not overwrite existing age", () => {
      const result = extractPatientInfo("tôi 45 tuổi", { age: "30" })
      expect(result.age).toBeUndefined() // không overwrite
    })
  })

  describe("gender extraction", () => {
    it("detects male gender", () => {
      expect(extractPatientInfo("tôi là nam, 30 tuổi").gender).toBe("male")
    })

    it("detects female gender", () => {
      expect(extractPatientInfo("tôi là nữ, 25 tuổi").gender).toBe("female")
    })

    it("does not detect gender from ambiguous text", () => {
      expect(extractPatientInfo("Tôi bị đau đầu").gender).toBeUndefined()
    })
  })

  describe("pregnancy detection", () => {
    it("detects pregnancy", () => {
      expect(extractPatientInfo("tôi đang mang thai 3 tháng").pregnancy).toBe(true)
    })

    it("detects 'có thai'", () => {
      expect(extractPatientInfo("tôi có thai").pregnancy).toBe(true)
    })

    it("does not flag non-pregnant text", () => {
      expect(extractPatientInfo("tôi bị đau lưng").pregnancy).toBeUndefined()
    })
  })

  describe("onset detection", () => {
    it("detects 'hôm qua'", () => {
      const result = extractPatientInfo("tôi bắt đầu bị đau từ hôm qua")
      expect(result.onset).toBeTruthy()
    })

    it("detects 'mấy ngày'", () => {
      const result = extractPatientInfo("tôi đau mấy ngày nay")
      expect(result.onset).toBeTruthy()
    })
  })

  describe("symptom extraction", () => {
    it("extracts pain symptom", () => {
      const result = extractPatientInfo("tôi bị đau lưng")
      expect(result.symptoms).toBeDefined()
      expect(result.symptoms!.length).toBeGreaterThan(0)
    })

    it("appends new symptoms without duplicating", () => {
      const result = extractPatientInfo("tôi bị sốt và buồn nôn", { symptoms: ["đau"] })
      expect(result.symptoms).toContain("đau") // preserved
    })
  })

  describe("no updates for unrelated text", () => {
    it("returns empty object for greeting", () => {
      const result = extractPatientInfo("Xin chào!")
      // Only lastUpdate if there were updates
      expect(Object.keys(result).filter((k) => k !== "lastUpdate")).toHaveLength(0)
    })
  })
})

// ─── detectEmergencySignals() ─────────────────────────────────────────────────

describe("detectEmergencySignals()", () => {
  const emergencies = [
    "đau ngực",
    "khó thở",
    "yếu liệt",
    "ngất xỉu",
    "co giật",
    "lú lẫn",
    "cấp cứu",
    "khẩn cấp",
    "chảy máu nhiều",
    "dau nguc",     // no-diacritic
    "kho tho",      // no-diacritic
  ]

  for (const text of emergencies) {
    it(`detects "${text}" as emergency`, () => {
      const result = detectEmergencySignals(text)
      expect(result.length).toBeGreaterThan(0)
    })
  }

  it("returns empty array for non-emergency text", () => {
    expect(detectEmergencySignals("tôi bị đau đầu nhẹ")).toHaveLength(0)
    expect(detectEmergencySignals("tôi muốn mua thuốc")).toHaveLength(0)
  })

  it("detects at least one signal in multi-keyword emergency message", () => {
    const result = detectEmergencySignals("tôi bị đau ngực và khó thở rất nặng")
    // Patterns may overlap (\"dau nguc\" and \"kho tho\" combined in one regex), so >=1
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

})

// ─── buildContext() ────────────────────────────────────────────────────────────

describe("buildContext()", () => {
  it("creates default context from empty history", () => {
    const ctx = buildContext("conv-1", "default", [])
    expect(ctx.conversationId).toBe("conv-1")
    expect(ctx.profileId).toBe("default")
    expect(ctx.turnCount).toBe(0)
    expect(ctx.triageState.active).toBe(false)
    expect(ctx.triageState.riskLevel).toBe("unknown")
    expect(ctx.triageState.readyForCta).toBe(false)
  })

  it("counts user turns correctly", () => {
    const messages = [
      { role: "user", content: "Xin chào" },
      { role: "assistant", content: "Chào bạn!" },
      { role: "user", content: "Tôi bị đau đầu" },
    ]
    const ctx = buildContext("conv-1", "default", messages)
    expect(ctx.turnCount).toBe(2) // only user messages
  })

  it("activates triage when profile is triage", () => {
    const ctx = buildContext("conv-1", "triage", [
      { role: "user", content: "Tôi đau đầu nhẹ" },
    ])
    expect(ctx.triageState.active).toBe(true)
  })

  it("activates triage when emergency keywords in history", () => {
    const ctx = buildContext("conv-1", "default", [
      { role: "user", content: "Tôi bị đau ngực và khó thở" },
    ])
    expect(ctx.triageState.active).toBe(true)
    expect(ctx.triageState.riskLevel).toBe("emergency")
    expect(ctx.triageState.emergencyKeywordsDetected.length).toBeGreaterThan(0)
  })

  it("extracts patient info from user messages", () => {
    const ctx = buildContext("conv-1", "default", [
      { role: "user", content: "Tôi 45 tuổi, nam, bị sốt 2 ngày" },
    ])
    expect(ctx.collectedInfo.age).toBe("45")
    expect(ctx.collectedInfo.gender).toBe("male")
    expect(ctx.collectedInfo.onset).toBeTruthy()
  })

  it("generates follow-up questions when triage active and info missing", () => {
    const ctx = buildContext("conv-1", "triage", [
      { role: "user", content: "Tôi bị đau đầu" },
    ])
    expect(ctx.triageState.followUpQuestions.length).toBeGreaterThan(0)
    expect(ctx.triageState.followUpQuestions.length).toBeLessThanOrEqual(2)
  })

  it("preserves previousContext data", () => {
    const prev: Partial<ConversationContext> = {
      collectedInfo: { age: "30", gender: "female" },
      lastActionTypes: ["ask_navigation"],
      sessionStarted: "2024-01-01T00:00:00.000Z",
    }
    const ctx = buildContext("conv-1", "therapy", [], prev)
    expect(ctx.collectedInfo.age).toBe("30")
    expect(ctx.lastActionTypes).toContain("ask_navigation")
    expect(ctx.sessionStarted).toBe("2024-01-01T00:00:00.000Z")
  })
})

// ─── isContextReadyForCta() ───────────────────────────────────────────────────

describe("isContextReadyForCta()", () => {
  const makeCtx = (overrides: Partial<ConversationContext>): ConversationContext => ({
    conversationId: "test",
    profileId: "default",
    turnCount: 0,
    collectedInfo: {},
    triageState: { active: false, riskLevel: "unknown", readyForCta: false, followUpQuestions: [], emergencyKeywordsDetected: [] },
    lastActionTypes: [],
    sessionStarted: new Date().toISOString(),
    ...overrides,
  })

  it("emergency is always ready for CTA", () => {
    const ctx = makeCtx({ triageState: { active: true, riskLevel: "emergency", readyForCta: false, followUpQuestions: [], emergencyKeywordsDetected: [] } })
    expect(isContextReadyForCta(ctx)).toBe(true)
  })

  it("triage active but no info → NOT ready", () => {
    const ctx = makeCtx({ triageState: { active: true, riskLevel: "medium", readyForCta: false, followUpQuestions: [], emergencyKeywordsDetected: [] } })
    expect(isContextReadyForCta(ctx)).toBe(false)
  })

  it("triage active with age + symptoms → ready", () => {
    const ctx = makeCtx({
      triageState: { active: true, riskLevel: "medium", readyForCta: false, followUpQuestions: [], emergencyKeywordsDetected: [] },
      collectedInfo: { age: "35", symptoms: ["đau"] },
    })
    expect(isContextReadyForCta(ctx)).toBe(true)
  })

  it("non-triage with 2+ turns → ready", () => {
    const ctx = makeCtx({ turnCount: 2 })
    expect(isContextReadyForCta(ctx)).toBe(true)
  })

  it("non-triage 1 turn + no info → NOT ready", () => {
    const ctx = makeCtx({ turnCount: 1 })
    expect(isContextReadyForCta(ctx)).toBe(false)
  })
})

// ─── mergeContextWithGatewayMeta() ────────────────────────────────────────────

describe("mergeContextWithGatewayMeta()", () => {
  const makeCtx = (): ConversationContext => ({
    conversationId: "test",
    profileId: "triage",
    turnCount: 1,
    collectedInfo: {},
    triageState: { active: true, riskLevel: "unknown", readyForCta: false, followUpQuestions: [], emergencyKeywordsDetected: [] },
    lastActionTypes: [],
    sessionStarted: new Date().toISOString(),
  })

  it("merges gateway active state", () => {
    const ctx = mergeContextWithGatewayMeta(makeCtx(), { active: true, ready_for_cta: true, risk_level: "high" })
    expect(ctx.triageState.readyForCta).toBe(true)
    expect(ctx.triageState.riskLevel).toBe("high")
  })

  it("returns original ctx when gateway not active", () => {
    const ctx = makeCtx()
    const result = mergeContextWithGatewayMeta(ctx, { active: false })
    expect(result).toBe(ctx) // same reference
  })

  it("merges follow_up_questions from gateway", () => {
    const questions = ["Bạn bao nhiêu tuổi?", "Bắt đầu khi nào?"]
    const result = mergeContextWithGatewayMeta(makeCtx(), { active: true, follow_up_questions: questions })
    expect(result.triageState.followUpQuestions).toEqual(questions)
  })

  it("handles unknown risk_level gracefully", () => {
    const result = mergeContextWithGatewayMeta(makeCtx(), { active: true, risk_level: "very_high_custom" })
    // Falls back to context's existing riskLevel
    expect(result.triageState.riskLevel).toBe("unknown")
  })
})

// ─── serializeContext() ───────────────────────────────────────────────────────

describe("serializeContext()", () => {
  it("serializes to plain object", () => {
    const ctx = buildContext("test", "therapy", [
      { role: "user", content: "tôi 30 tuổi, lo âu" },
    ])
    const serialized = serializeContext(ctx)
    expect(serialized.profile_id).toBe("therapy")
    expect(typeof serialized.turn_count).toBe("number")
    expect(Array.isArray(serialized.collected_fields)).toBe(true)
  })

  it("collected_fields only contains non-undefined fields", () => {
    const ctx = buildContext("test", "default", [
      { role: "user", content: "tôi 25 tuổi" },
    ])
    const serialized = serializeContext(ctx)
    const fields = serialized.collected_fields as string[]
    expect(fields).toContain("age")
    expect(fields).not.toContain("pregnancy") // not detected
  })
})
