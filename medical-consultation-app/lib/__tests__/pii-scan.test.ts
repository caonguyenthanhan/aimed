import { describe, it, expect } from "vitest"
import { scanPii } from "../pii-scan"

describe("pii-scan", () => {
  describe("scanPii", () => {
    it("returns not blocked for clean text", () => {
      const result = scanPii("benh nhan bi dau dau nhe")
      expect(result.blocked).toBe(false)
      expect(result.findings).toHaveLength(0)
    })

    it("detects email address", () => {
      const result = scanPii("lien he qua email test@example.com nhe")
      expect(result.blocked).toBe(true)
      expect(result.findings.some((f) => f.type === "email")).toBe(true)
    })

    it("detects Vietnamese phone number starting with 0", () => {
      const result = scanPii("goi so 0901234567 de dat lich")
      expect(result.blocked).toBe(true)
      expect(result.findings.some((f) => f.type === "phone")).toBe(true)
    })

    it("detects phone number with +84 prefix", () => {
      const result = scanPii("so dien thoai +84901234567")
      expect(result.blocked).toBe(true)
      expect(result.findings.some((f) => f.type === "phone")).toBe(true)
    })

    it("handles empty string", () => {
      const result = scanPii("")
      expect(result.blocked).toBe(false)
      expect(result.findings).toHaveLength(0)
    })

    it("does not duplicate findings for same match", () => {
      const result = scanPii("test@example.com va test@example.com lai")
      const emails = result.findings.filter(
        (f) => f.type === "email" && f.match === "test@example.com"
      )
      expect(emails).toHaveLength(1)
    })

    it("detects multiple PII types in one text", () => {
      const result = scanPii("info@clinic.vn va 0912345678")
      expect(result.blocked).toBe(true)
      const types = new Set(result.findings.map((f) => f.type))
      expect(types.size).toBeGreaterThan(1)
    })

    it("truncates match to max 120 chars", () => {
      const longLocal = "a".repeat(200)
      const result = scanPii(`${longLocal}@example.com`)
      for (const f of result.findings) {
        expect(f.match.length).toBeLessThanOrEqual(120)
      }
    })

    it("finding has correct shape", () => {
      const result = scanPii("contact@test.vn")
      expect(result.findings[0]).toMatchObject({
        type: expect.any(String),
        label: expect.any(String),
        match: expect.any(String),
      })
    })
  })
})
