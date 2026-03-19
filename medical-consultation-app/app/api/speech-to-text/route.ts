import { NextRequest, NextResponse } from "next/server"
import { geminiTranscribe } from "@/lib/gemini-audio"

const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "http://localhost:8000").trim().replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = (formData.get("audio_file") || formData.get("file") || formData.get("audio")) as File | null
    if (!audioFile) {
      return NextResponse.json({ success: false, error: "Missing audio_file" }, { status: 400 })
    }

    const key = String(process.env.GEMINI_API_KEY || "").trim()
    if (key) {
      const ab = await audioFile.arrayBuffer()
      const base64 = Buffer.from(ab).toString("base64")
      const mimeType = String((audioFile as any)?.type || "audio/webm")
      const model = (process.env.GEMINI_STT_MODEL && String(process.env.GEMINI_STT_MODEL).trim()) ? String(process.env.GEMINI_STT_MODEL).trim() : undefined
      const out = await geminiTranscribe({ apiKey: key, audioBase64: base64, mimeType, model })
      const text = String(out?.text || "").trim()
      if (text) return NextResponse.json({ success: true, text, provider: "gemini" })
    }

    const response = await fetch(`${backendUrl}/v1/speech-to-text`, { method: "POST", body: formData })
    if (!response.ok) throw new Error(`Backend responded with status: ${response.status}`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process speech-to-text" }, { status: 500 })
  }
}
