/**
 * Tests for planResponseMessages() — the function that converts raw actions[]
 * into messages[] that the client renders as UI cards.
 *
 * This tests the SERVER-SIDE logic in /api/agent-chat/route.ts.
 * We test the logic directly by extracting it and mocking dependencies.
 */
import { buildNavLinkMessage, planChunkedMessages } from "../chat-delivery"
import { isAllowedPath } from "../agent-actions"

// ─── Replicate the core planResponseMessages logic for isolated testing ───────
// This mirrors the function in agent-chat/route.ts so we can test it in isolation
function planResponseMessages(
  content: string,
  actions: any[],
  deliveryMode: "chunked" | "live" = "chunked"
): any[] {
  const msgs: any[] = []

  // Add text content
  if (deliveryMode === "chunked") {
    const planned = planChunkedMessages(content)
    if (planned.length) {
      msgs.push(...planned)
    } else {
      msgs.push({ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 })
    }
  } else {
    msgs.push({ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 })
  }

  // Process actions
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!action?.type) continue

      if (action.type === "navigate" && isAllowedPath(String(action?.args?.path || ""))) {
        const p = String(action.args.path).trim()
        msgs.push(buildNavLinkMessage(p))
      }

      if (action.type === "ask_navigation") {
        msgs.push({
          content: "",
          kind: "ask_navigation",
          delay_ms: 300,
          data: {
            feature: action.args?.feature,
            reason: action.args?.reason || "Bạn muốn mở tính năng này không?",
            context: action.args?.context || {},
          },
        })
      }

      if (action.type === "embed") {
        msgs.push({
          content: "",
          kind: "embed",
          delay_ms: 300,
          data: {
            feature: action.args?.feature,
            context: action.args?.context || {},
          },
        })
      }

      if (action.type === "play_music") {
        msgs.push({
          content: "",
          kind: "play_music",
          delay_ms: 200,
          data: {
            videoId: action.args?.videoId,
            title: action.args?.title,
            artist: action.args?.artist,
            autoplay: action.args?.autoplay !== false,
          },
        })
      }

      if (action.type === "recommend_music") {
        msgs.push({
          content: "",
          kind: "recommend_music",
          delay_ms: 300,
          data: {
            recommendations: action.args?.recommendations || [],
            mood: action.args?.mood,
            message: action.args?.message,
          },
        })
      }
    }
  }

  return msgs.length
    ? msgs
    : [{ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 }]
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("planResponseMessages()", () => {
  describe("text content", () => {
    it("returns at least one text message for any non-empty content", () => {
      const msgs = planResponseMessages("Xin chào bạn!", [], "chunked")
      expect(msgs.length).toBeGreaterThan(0)
      const textMsgs = msgs.filter((m) => m.kind === "text" || !m.kind)
      expect(textMsgs.length).toBeGreaterThan(0)
    })

    it("handles empty content with empty actions gracefully", () => {
      const msgs = planResponseMessages("", [], "chunked")
      expect(msgs.length).toBeGreaterThan(0)
      expect(msgs[0].content).toBeTruthy()
    })

    it("chunks long content into multiple text messages", () => {
      const longText = Array.from(
        { length: 10 },
        (_, i) => `Đoạn ${i + 1}: Đây là nội dung dài để kiểm tra việc chia nhỏ tin nhắn.`
      ).join("\n\n")
      const msgs = planResponseMessages(longText, [], "chunked")
      expect(msgs.length).toBeGreaterThanOrEqual(1)
      expect(msgs.every((m) => typeof m.content === "string")).toBe(true)
    })
  })

  describe("navigate action", () => {
    it("adds a nav_link message for allowed path", () => {
      const msgs = planResponseMessages("Chuyển trang", [
        { type: "navigate", args: { path: "/sang-loc" } },
      ])
      const navMsg = msgs.find((m) => m.kind === "link")
      expect(navMsg).toBeDefined()
      expect(navMsg?.content).toContain("/sang-loc")
    })

    it("does NOT add nav_link for disallowed path", () => {
      const msgs = planResponseMessages("Text", [
        { type: "navigate", args: { path: "/admin/hack" } },
      ])
      const navMsg = msgs.find((m) => m.kind === "link")
      expect(navMsg).toBeUndefined()
    })

    it("does NOT add nav_link for external URL", () => {
      const msgs = planResponseMessages("Text", [
        { type: "navigate", args: { path: "https://evil.com" } },
      ])
      const navMsg = msgs.find((m) => m.kind === "link")
      expect(navMsg).toBeUndefined()
    })
  })

  describe("ask_navigation action", () => {
    it("creates an ask_navigation message card", () => {
      const msgs = planResponseMessages("Bạn muốn mở Sàng lọc không?", [
        {
          type: "ask_navigation",
          args: { feature: "sang-loc", reason: "Đánh giá mức độ lo âu" },
        },
      ])
      const card = msgs.find((m) => m.kind === "ask_navigation")
      expect(card).toBeDefined()
      expect(card?.data?.feature).toBe("sang-loc")
      expect(card?.data?.reason).toBe("Đánh giá mức độ lo âu")
    })

    it("uses default reason when reason is missing", () => {
      const msgs = planResponseMessages("Text", [
        { type: "ask_navigation", args: { feature: "bac-si" } },
      ])
      const card = msgs.find((m) => m.kind === "ask_navigation")
      expect(card?.data?.reason).toBeTruthy()
    })

    it("sets correct delay_ms", () => {
      const msgs = planResponseMessages("Text", [
        { type: "ask_navigation", args: { feature: "tri-lieu", reason: "Test" } },
      ])
      const card = msgs.find((m) => m.kind === "ask_navigation")
      expect(card?.delay_ms).toBe(300)
    })

    it("preserves context object", () => {
      const msgs = planResponseMessages("Text", [
        {
          type: "ask_navigation",
          args: { feature: "bac-si", reason: "Hỏi", context: { specialty: "cardiology" } },
        },
      ])
      const card = msgs.find((m) => m.kind === "ask_navigation")
      expect(card?.data?.context?.specialty).toBe("cardiology")
    })
  })

  describe("embed action", () => {
    it("creates an embed message card", () => {
      const msgs = planResponseMessages("Nhúng sàng lọc", [
        { type: "embed", args: { feature: "sang-loc", context: { prefill: "phq9" } } },
      ])
      const card = msgs.find((m) => m.kind === "embed")
      expect(card).toBeDefined()
      expect(card?.data?.feature).toBe("sang-loc")
      expect(card?.data?.context?.prefill).toBe("phq9")
    })

    it("defaults context to empty object when missing", () => {
      const msgs = planResponseMessages("Text", [
        { type: "embed", args: { feature: "tra-cuu" } },
      ])
      const card = msgs.find((m) => m.kind === "embed")
      expect(card?.data?.context).toEqual({})
    })
  })

  describe("play_music action", () => {
    it("creates a play_music message", () => {
      const msgs = planResponseMessages("Nghe nhạc thư giãn", [
        {
          type: "play_music",
          args: { videoId: "abc123", title: "Calm Music", artist: "Artist A", autoplay: true },
        },
      ])
      const card = msgs.find((m) => m.kind === "play_music")
      expect(card).toBeDefined()
      expect(card?.data?.videoId).toBe("abc123")
      expect(card?.data?.title).toBe("Calm Music")
      expect(card?.data?.autoplay).toBe(true)
    })

    it("defaults autoplay to true when not specified", () => {
      const msgs = planResponseMessages("Text", [
        { type: "play_music", args: { videoId: "xyz", title: "Song" } },
      ])
      const card = msgs.find((m) => m.kind === "play_music")
      expect(card?.data?.autoplay).toBe(true)
    })

    it("respects autoplay=false", () => {
      const msgs = planResponseMessages("Text", [
        { type: "play_music", args: { videoId: "xyz", title: "Song", autoplay: false } },
      ])
      const card = msgs.find((m) => m.kind === "play_music")
      expect(card?.data?.autoplay).toBe(false)
    })

    it("sets delay_ms to 200 (faster than other cards)", () => {
      const msgs = planResponseMessages("Text", [
        { type: "play_music", args: { videoId: "xyz", title: "Song" } },
      ])
      const card = msgs.find((m) => m.kind === "play_music")
      expect(card?.delay_ms).toBe(200)
    })
  })

  describe("recommend_music action", () => {
    it("creates a recommend_music message", () => {
      const recommendations = [
        { videoId: "v1", title: "Song 1", mood: "calm" },
        { videoId: "v2", title: "Song 2", mood: "calm" },
      ]
      const msgs = planResponseMessages("Gợi ý nhạc", [
        { type: "recommend_music", args: { recommendations, mood: "calm", message: "Thư giãn nhé" } },
      ])
      const card = msgs.find((m) => m.kind === "recommend_music")
      expect(card).toBeDefined()
      expect(card?.data?.recommendations).toHaveLength(2)
      expect(card?.data?.mood).toBe("calm")
      expect(card?.data?.message).toBe("Thư giãn nhé")
    })

    it("defaults recommendations to empty array when missing", () => {
      const msgs = planResponseMessages("Text", [
        { type: "recommend_music", args: {} },
      ])
      const card = msgs.find((m) => m.kind === "recommend_music")
      expect(card?.data?.recommendations).toEqual([])
    })
  })

  describe("multiple actions in one response", () => {
    it("includes all valid action cards in correct order", () => {
      const msgs = planResponseMessages(
        "Bạn có vẻ lo âu. Mình có thể giúp!",
        [
          { type: "ask_navigation", args: { feature: "sang-loc", reason: "Đánh giá" } },
          { type: "navigate", args: { path: "/tri-lieu" } },
        ]
      )
      const askNavCard = msgs.find((m) => m.kind === "ask_navigation")
      const navLink = msgs.find((m) => m.kind === "link")
      expect(askNavCard).toBeDefined()
      expect(navLink).toBeDefined()
      // Text should come before action cards
      const textIdx = msgs.findIndex((m) => m.kind === "text" || !m.kind)
      const cardIdx = msgs.findIndex((m) => m.kind === "ask_navigation")
      expect(textIdx).toBeLessThan(cardIdx)
    })

    it("silently ignores unknown action types", () => {
      const msgs = planResponseMessages("Text", [
        { type: "unknown_action", args: {} },
        { type: "ask_navigation", args: { feature: "bac-si", reason: "Test" } },
      ])
      // Should have text + ask_navigation, no unknown card
      const kinds = msgs.map((m) => m.kind)
      expect(kinds).not.toContain("unknown_action")
      expect(kinds).toContain("ask_navigation")
    })

    it("handles null/undefined action items gracefully", () => {
      const msgs = planResponseMessages("Text", [null, undefined, { type: "ask_navigation", args: { feature: "bac-si", reason: "OK" } }] as any[])
      expect(msgs.some((m) => m.kind === "ask_navigation")).toBe(true)
    })
  })

  describe("speak action", () => {
    it("does NOT create a separate card (content already in main text)", () => {
      const msgs = planResponseMessages("Đây là nội dung nói", [
        { type: "speak", args: { text: "Đây là nội dung nói" } },
      ])
      const speakCards = msgs.filter((m) => m.kind === "speak")
      expect(speakCards).toHaveLength(0)
    })
  })
})
