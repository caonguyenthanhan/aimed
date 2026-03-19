import { NextRequest, NextResponse } from "next/server"
import { sanitizeTtsText } from "@/lib/tts-text"
import { geminiTextToSpeech } from "@/lib/gemini-audio"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''
    const sanitized = sanitizeTtsText(String(text))

    const key = String(process.env.GEMINI_API_KEY || "").trim()
    if (key && sanitized.trim()) {
      const model = (process.env.GEMINI_TTS_MODEL && String(process.env.GEMINI_TTS_MODEL).trim()) ? String(process.env.GEMINI_TTS_MODEL).trim() : undefined
      const voiceName = (process.env.GEMINI_TTS_VOICE && String(process.env.GEMINI_TTS_VOICE).trim()) ? String(process.env.GEMINI_TTS_VOICE).trim() : undefined
      const out = await geminiTextToSpeech({ apiKey: key, text: sanitized, model, voiceName })
      if (out.audioBase64) {
        return NextResponse.json({ audio_url: `data:audio/mpeg;base64,${out.audioBase64}`, provider: "gemini" })
      }
    }

    const payload = { ...body, text: sanitized }
    const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "http://localhost:8000").trim().replace(/\/$/, "")
    const response = await fetch(`${backendUrl}/v1/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Backend responded with status: ${response.status}`)
    const data = await response.json()
    if (data.download_url) data.audio_url = `${backendUrl}${data.download_url}`
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 })
  }
}
