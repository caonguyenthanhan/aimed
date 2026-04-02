import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Default suggestions when AI is unavailable
const DEFAULT_SUGGESTIONS = [
  "Tôi bị đau đầu, có phải cảm cúm không?",
  "Liệu pháp nào giúp giảm lo âu?",
  "Cách phòng ngừa cảm cúm?"
]

export async function POST(request: Request) {
  try {
    const { messages, context } = await request.json()
    
    // If no messages or no API key, return default suggestions
    if (!GEMINI_API_KEY || !messages || messages.length === 0) {
      return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS })
    }

    // Build conversation context for AI
    const conversationContext = messages
      .slice(-5) // Last 5 messages
      .map((m: any) => `${m.isUser ? 'User' : 'AI'}: ${m.content}`)
      .join('\n')

    const prompt = `Bạn là trợ lý AI y tế. Dựa vào cuộc hội thoại sau, hãy tạo ra 3 câu hỏi gợi ý phù hợp để người dùng có thể hỏi tiếp. Các câu hỏi phải:
1. Liên quan đến nội dung đã trao đổi
2. Giúp người dùng tìm hiểu sâu hơn về vấn đề sức khỏe
3. Ngắn gọn (dưới 50 ký tự mỗi câu)
4. Đặc câu hỏi tự nhiên

Cuộc hội thoại:
${conversationContext || 'Chưa có cuộc hội thoại'}

Chỉ trả về 3 câu hỏi, mỗi câu 1 dòng, không đánh số, không giải thích. Nếu chưa có cuộc hội thoại thì gợi ý các câu hỏi sức khỏe chung.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        })
      }
    )

    if (!response.ok) {
      // Silently fallback to defaults on API error
      return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Parse suggestions from response
    const suggestions = text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 5 && line.length < 80)
      .slice(0, 3)

    // Return parsed suggestions or defaults if parsing failed
    if (suggestions.length >= 2) {
      return NextResponse.json({ suggestions })
    }
    
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS })

  } catch (error) {
    // Silently fallback to defaults
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS })
  }
}
