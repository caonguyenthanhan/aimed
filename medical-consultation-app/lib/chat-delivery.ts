import type { ChatDeliveryMessageDto } from "@/lib/chat-delivery-schema"

export function planChunkedMessages(text: string, opts?: { maxMessages?: number; maxCharsPerMessage?: number }) {
  const raw = String(text || "").trim()
  if (!raw) return [] as ChatDeliveryMessageDto[]
  const maxMessages = Math.max(1, Math.min(12, Number(opts?.maxMessages ?? 6)))
  const maxChars = Math.max(80, Math.min(2000, Number(opts?.maxCharsPerMessage ?? 420)))

  const parts = raw
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const out: ChatDeliveryMessageDto[] = []
  for (const p of parts) {
    if (!p) continue
    if (p.length <= maxChars) {
      out.push({ content: p, kind: "text" })
      continue
    }
    const sentences = p.split(/(?<=[.!?…])\s+/g).filter(Boolean)
    let buf = ""
    for (const s of sentences) {
      const next = buf ? `${buf} ${s}` : s
      if (next.length > maxChars && buf) {
        out.push({ content: buf, kind: "text" })
        buf = s
      } else {
        buf = next
      }
    }
    if (buf) out.push({ content: buf, kind: "text" })
  }

  const result: ChatDeliveryMessageDto[] = []
  
  for (let i = 0; i < out.length && result.length < maxMessages; i++) {
    result.push(out[i])
  }
  
  if (out.length > maxMessages) {
    const remaining = out.slice(maxMessages)
    const restContent = remaining.map((x) => x.content).join("\n\n").trim()
    if (restContent) {
      result.push({ content: restContent, kind: "text" })
    }
  }

  return result.map((m, i) => ({ ...m, delay_ms: i === 0 ? 0 : 450 }))
}

export function buildNavLinkMessage(path: string) {
  const p = String(path || "").trim()
  const label =
    p === "/sang-loc"
      ? "Mở trang Sàng lọc"
      : p === "/tri-lieu"
        ? "Mở trang Trị liệu"
        : p === "/nhac-nho"
          ? "Mở trang Nhắc nhở"
          : `Mở ${p}`
  return {
    content: `Nếu bạn sẵn sàng, bấm vào đây để chuyển trang:\n\n- [${label}](${p})`,
    kind: "link" as const,
    delay_ms: 650,
  } satisfies ChatDeliveryMessageDto
}

