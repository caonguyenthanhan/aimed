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
  
  // Add first batch of chunks (up to maxMessages)
  for (let i = 0; i < out.length && result.length < maxMessages; i++) {
    if (out[i].content) {
      result.push(out[i])
    }
  }
  
  // Combine remaining chunks if any
  if (out.length > maxMessages) {
    const remaining = out.slice(maxMessages)
    const restContent = remaining
      .map((x) => x.content)
      .filter(Boolean)
      .join("\n\n")
      .trim()
    
    if (restContent) {
      result.push({ content: restContent, kind: "text" })
    }
  }

  if (!result.length) {
    return [{ content: out.map((x) => x.content).join("\n\n").trim() || " ", kind: "text", delay_ms: 0 }]
  }

  return result.map((m, i) => ({ ...m, delay_ms: i === 0 ? 0 : 450 }))
}

/**
 * Verify that chunked messages preserve all original content
 * @param original The original text
 * @param chunked The chunked messages
 * @returns true if all original text is preserved
 */
export function verifyContentIntegrity(original: string, chunked: ChatDeliveryMessageDto[]): boolean {
  const originalText = String(original || "").trim()
  if (!originalText) return !chunked.length || !chunked.some((m) => m.content.trim())
  
  const reconstructed = chunked
    .map((m) => String(m.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
  
  if (!reconstructed) {
    console.warn("[v0] Content integrity check failed: reconstructed text is empty")
    return false
  }
  
  // Check if original content is substantially preserved (allowing for whitespace normalization)
  const originalWords = originalText.toLowerCase().split(/\s+/)
  const reconstructedWords = reconstructed.toLowerCase().split(/\s+/)
  
  if (originalWords.length !== reconstructedWords.length) {
    const missing = originalWords.filter((w) => !reconstructedWords.includes(w))
    if (missing.length > 0) {
      console.warn(`[v0] Content integrity check: ${missing.length} words possibly lost`, missing.slice(0, 5))
      return false
    }
  }
  
  return true
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

