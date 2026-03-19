import { NextRequest, NextResponse } from "next/server"
import { sanitizeTtsText } from "@/lib/tts-text"
import { geminiTextToSpeech } from "@/lib/gemini-audio"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const text = url.searchParams.get('text')
    const lang = url.searchParams.get('lang') || 'vi'

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const sanitized = sanitizeTtsText(String(text))
    const key = String(process.env.GEMINI_API_KEY || "").trim()
    if (key && sanitized.trim()) {
      const model = (process.env.GEMINI_TTS_MODEL && String(process.env.GEMINI_TTS_MODEL).trim()) ? String(process.env.GEMINI_TTS_MODEL).trim() : undefined
      const voiceName = (process.env.GEMINI_TTS_VOICE && String(process.env.GEMINI_TTS_VOICE).trim()) ? String(process.env.GEMINI_TTS_VOICE).trim() : undefined
      const out = await geminiTextToSpeech({ apiKey: key, text: sanitized, model, voiceName }).catch(() => null)
      if (out?.audioBase64) {
        const bytes = Buffer.from(String(out.audioBase64), "base64")
        const headers = new Headers()
        headers.set("Content-Type", "audio/mpeg")
        headers.set("Cache-Control", "no-store")
        return new Response(bytes, { status: 200, headers })
      }
    }

    const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '')
    const target = `${backendUrl}/v1/text-to-speech-stream?text=${encodeURIComponent(sanitized)}&lang=${encodeURIComponent(lang)}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let resp: Response | null = null
    try {
      resp = await fetch(target, { signal: controller.signal })
    } catch (e) {
      resp = null
    } finally {
      clearTimeout(timer)
    }

    if (resp && resp.ok && resp.body) {
      const headers = new Headers(resp.headers)
      headers.set('Content-Type', 'audio/mpeg')
      headers.delete('Content-Length')
      return new Response(resp.body, { status: 200, headers })
    }

    const fallbackResp = await fetch(`${backendUrl}/v1/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sanitized, lang })
    })
    if (!fallbackResp.ok) {
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 502 })
    }
    const data = await fallbackResp.json()
    const audioUrl = typeof data?.download_url === 'string' ? `${backendUrl}${data.download_url}` : String(data?.audio_url || '')
    if (!audioUrl) {
      return NextResponse.json({ error: 'No audio URL from backend' }, { status: 502 })
    }
    const fileResp = await fetch(audioUrl)
    if (!fileResp.ok || !fileResp.body) {
      return NextResponse.json({ error: 'Failed to fetch audio file' }, { status: 502 })
    }
    const headers = new Headers(fileResp.headers)
    headers.set('Content-Type', 'audio/mpeg')
    headers.delete('Content-Length')
    return new Response(fileResp.body, { status: 200, headers })
  } catch (error) {
    console.error('Text-to-speech stream API error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
