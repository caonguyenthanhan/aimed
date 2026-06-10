import { describe, it, expect } from "vitest"
import { checkText, buildBlockResponse, shouldBlock } from "../safety"

describe("safety", () => {
  describe("checkText", () => {
    it("returns empty for safe text", () => {
      expect(checkText("tôi bị đau đầu")).toHaveLength(0)
      expect(checkText("")).toHaveLength(0)
    })

    it("detects self_harm terms", () => {
      const hits = checkText("tôi muốn chết vì quá mệt")
      expect(hits.length).toBeGreaterThan(0)
      expect(hits.some((h) => h.category === "self_harm")).toBe(true)
    })

    it("detects overdose term", () => {
      const hits = checkText("uống thuốc quá liều có sao không")
      expect(hits.some((h) => h.category === "self_harm")).toBe(true)
    })

    it("detects violence terms", () => {
      const hits = checkText("tôi muốn giết người")
      expect(hits.some((h) => h.category === "violence")).toBe(true)
    })

    it("is case-insensitive", () => {
      const hits = checkText("OVERDOSE")
      expect(hits.some((h) => h.category === "self_harm")).toBe(true)
    })

    it("returns multiple hits when multiple terms match", () => {
      const hits = checkText("tự tử và giết người")
      const cats = new Set(hits.map((h) => h.category))
      expect(cats.has("self_harm")).toBe(true)
      expect(cats.has("violence")).toBe(true)
    })
  })

  describe("buildBlockResponse", () => {
    it("returns self_harm response when category is self_harm", () => {
      const resp = buildBlockResponse([{ category: "self_harm", term: "tự tử" }])
      expect(resp).toContain("115")
      expect(resp).toContain("tự làm hại bản thân")
    })

    it("returns violence response when category is violence", () => {
      const resp = buildBlockResponse([{ category: "violence", term: "giết người" }])
      expect(resp).toContain("bạo lực")
    })

    it("prioritizes self_harm over violence when both present", () => {
      const resp = buildBlockResponse([
        { category: "self_harm", term: "tự tử" },
        { category: "violence", term: "giết người" },
      ])
      expect(resp).toContain("115")
    })
  })

  describe("shouldBlock", () => {
    it("detects harm in current message", () => {
      const hits = shouldBlock("tôi muốn chết")
      expect(hits.length).toBeGreaterThan(0)
    })

    it("returns empty for safe message with no history", () => {
      expect(shouldBlock("tôi bị sổ mũi")).toHaveLength(0)
    })

    it("detects harm from recent history", () => {
      const history = [
        { role: "user", content: "tôi rất mệt" },
        { role: "user", content: "tôi muốn tự tử" },
      ]
      const hits = shouldBlock("vâng", history)
      expect(hits.some((h) => h.category === "self_harm")).toBe(true)
    })

    it("ignores assistant messages in history", () => {
      const history = [
        { role: "assistant", content: "tôi muốn tự tử" }, // assistant says it, should not trigger
      ]
      const hits = shouldBlock("thế nào", history)
      expect(hits).toHaveLength(0)
    })

    it("only scans last 8 user messages from history", () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: "user",
        content: i === 0 ? "tôi muốn chết" : "tin nhắn bình thường",
      }))
      // The harmful message is at index 0, older than 8, should not be scanned
      const hits = shouldBlock("ok", history)
      expect(hits).toHaveLength(0)
    })
  })
})
