import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// Default suggestions when AI is unavailable
const DEFAULT_SUGGESTIONS = [
  "Toi bi dau dau, co phai cam cum khong?",
  "Lieu phap nao giup giam lo au?",
  "Thong tin ve thuoc Paracetamol?",
  "Cach phong ngua cam cum?"
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

    const prompt = `Ban la tro ly y te AI. Dua vao cuoc hoi thoai sau, hay tao ra 4 cau hoi goi y phu hop de nguoi dung co the hoi tiep. Cac cau hoi phai:
1. Lien quan den noi dung da trao doi
2. Giup nguoi dung tim hieu sau hon ve van de suc khoe
3. Ngan gon (duoi 50 ky tu moi cau)
4. Dang cau hoi tu nhien

Cuoc hoi thoai:
${conversationContext || 'Chua co cuoc hoi thoai'}

Chi tra ve 4 cau hoi, moi cau 1 dong, khong danh so, khong giai thich. Neu chua co cuoc hoi thoai thi goi y cac cau hoi suc khoe chung.`

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
      .slice(0, 4)

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
