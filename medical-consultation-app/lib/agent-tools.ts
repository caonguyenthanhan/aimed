import type { AgentAction } from "@/lib/agent-actions"

export type AgentToolCall = { name: string; args: any }

export function geminiToolDeclarations() {
  return [
    {
      name: "navigate",
      description: "Điều hướng UI sang một trang trong ứng dụng (path bắt đầu bằng /).",
      parameters: {
        type: "OBJECT",
        properties: {
          path: { type: "STRING", description: "Đường dẫn nội bộ, ví dụ /sang-loc" },
        },
        required: ["path"],
      },
    },
    {
      name: "speak",
      description: "Đọc to (TTS) một đoạn văn bản ngắn cho người dùng.",
      parameters: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING", description: "Nội dung cần đọc to" },
        },
        required: ["text"],
      },
    },
    {
      name: "open_screening",
      description: "Mở trang sàng lọc tâm lý (/sang-loc).",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "open_therapy",
      description: "Mở trang trị liệu kỹ thuật số (/tri-lieu).",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "open_reminders",
      description: "Mở trang nhắc nhở (/nhac-nho).",
      parameters: { type: "OBJECT", properties: {} },
    },
  ]
}

export function toolCallsToActions(calls: AgentToolCall[]): AgentAction[] {
  const out: AgentAction[] = []
  for (const c of calls) {
    const name = String(c?.name || "").trim()
    if (!name) continue
    if (name === "navigate") {
      out.push({ type: "navigate", args: { path: String(c?.args?.path || "").trim() } } as any)
      continue
    }
    if (name === "speak") {
      out.push({ type: "speak", args: { text: String(c?.args?.text || "").trim() } } as any)
      continue
    }
    if (name === "open_screening") out.push({ type: "navigate", args: { path: "/sang-loc" } } as any)
    if (name === "open_therapy") out.push({ type: "navigate", args: { path: "/tri-lieu" } } as any)
    if (name === "open_reminders") out.push({ type: "navigate", args: { path: "/nhac-nho" } } as any)
  }
  return out
}
