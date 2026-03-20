import { describe, expect, test } from "vitest"
import { ChatDeliveryMessageSchema, ChatDeliveryModeSchema } from "../chat-delivery-schema"

describe("chat-delivery-schema", () => {
  test("validates delivery mode", () => {
    expect(ChatDeliveryModeSchema.parse("chunked")).toBe("chunked")
    expect(ChatDeliveryModeSchema.parse("live")).toBe("live")
  })

  test("validates delivery message", () => {
    const m = ChatDeliveryMessageSchema.parse({ content: "Xin chào", delay_ms: 200, kind: "text" })
    expect(m.content).toBe("Xin chào")
  })
})
