import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

function offlineTitle(text: string) {
  const s = String(text || "").trim()
  if (!s) return "Hội thoại"
  const cleaned = s.replace(/\s+/g, " ").trim()
  const words = cleaned.split(" ").filter(Boolean).slice(0, 8)
  return words.join(" ").slice(0, 50) || "Hội thoại"
}

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = await req.json()

    if (!messages || messages.length === 0) {
      return Response.json({ name: "New Conversation" })
    }

    // Get first user message for naming
    const firstUserMessage = messages.find((m: any) => m.isUser)?.content
    if (!firstUserMessage) {
      return Response.json({ name: "Hội thoại" })
    }

    const fozaToken = String(process.env.FOZA_TOKEN || "").trim()
    const fozaModel = String(process.env.LLM_MODEL_NAME || "").trim()
    const fozaBaseUrl = String(process.env.FOZA_BASE_URL || "").trim().replace(/\/$/, "") || "https://api.foza.ai/v1"

    const prompt = [
      'Tạo tiêu đề hội thoại cực ngắn (tối đa 8 từ, tối đa 50 ký tự).',
      'Chỉ trả về đúng tiêu đề, không thêm ký tự khác.',
      `Nội dung: "${String(firstUserMessage || "").trim()}"`,
    ].join("\n")

    let conversationName = ""
    if (fozaToken && fozaModel) {
      const resp = await fetch(`${fozaBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${fozaToken}` },
        body: JSON.stringify({
          model: fozaModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      })
      const json = await resp.json().catch(() => null)
      conversationName = String(json?.choices?.[0]?.message?.content || "").trim().slice(0, 50)
    } else if (String(process.env.GEMINI_API_KEY || "").trim()) {
      const model = genAI.getGenerativeModel({ model: String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim() || "gemini-2.5-flash" })
      const result = await model.generateContent(prompt)
      conversationName = result.response.text().trim().slice(0, 50)
    }

    return Response.json({ 
      name: conversationName || offlineTitle(firstUserMessage),
      conversationId 
    })
  } catch (error) {
    console.error("[v0] Error auto-naming conversation:", error)
    return Response.json({ name: "Hội thoại" }, { status: 200 })
  }
}
