import { describe, expect, test, vi } from "vitest"
import { IdleBuffer } from "../idle-buffer"

describe("IdleBuffer", () => {
  test("flushes after idle window and aggregates messages", async () => {
    vi.useFakeTimers()
    const flushed: string[] = []
    const b = new IdleBuffer({ idleMs: 5000, onFlush: async (t) => flushed.push(t) })

    b.add("a")
    vi.advanceTimersByTime(3000)
    b.add("b")
    vi.advanceTimersByTime(4999)
    expect(flushed.length).toBe(0)

    vi.advanceTimersByTime(1)
    await vi.runAllTicks()
    await vi.runAllTimersAsync()
    expect(flushed).toEqual(["a\nb"])
    vi.useRealTimers()
  })
})
