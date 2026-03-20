import { describe, expect, test } from "vitest"
import { buildNavLinkMessage, planChunkedMessages } from "../chat-delivery"

describe("chat-delivery", () => {
  test("planChunkedMessages returns multiple chunks for long text", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Câu ${i + 1}. Đây là một câu khá dài để kiểm tra việc tách.`).join(" ")
    const msgs = planChunkedMessages(text, { maxMessages: 6, maxCharsPerMessage: 180 })
    expect(msgs.length).toBeGreaterThan(1)
    expect(msgs.every((m) => typeof m.content === "string" && m.content.trim().length > 0)).toBe(true)
    expect(msgs[0].delay_ms).toBe(0)
    expect(msgs.slice(1).every((m) => m.delay_ms === 450)).toBe(true)
  })

  test("buildNavLinkMessage creates a markdown link", () => {
    const m = buildNavLinkMessage("/sang-loc")
    expect(m.kind).toBe("link")
    expect(m.content).toContain("](/sang-loc)")
  })
})
