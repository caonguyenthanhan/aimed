import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { sanitizeTtsText } from "@/lib/tts-text"
import { geminiTextToSpeech } from "@/lib/gemini-audio"
import { supertoneTextToSpeech } from "@/lib/supertone-tts"

const dataDir = path.join(process.cwd(), "data")
const runtimeEventsPath = path.join(dataDir, "runtime-events.jsonl")
const runtimeMetricsPath = path.join(dataDir, "runtime-metrics.jsonl")

const ensureLogs = () => {
  if (process.env.VERCEL) return
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    if (!fs.existsSync(runtimeEventsPath)) fs.writeFileSync(runtimeEventsPath, "")
    if (!fs.existsSync(runtimeMetricsPath)) fs.writeFileSync(runtimeMetricsPath, "")
  } catch {}
}

const appendEvent = (evt: any) => {
  try {
    ensureLogs()
    fs.appendFileSync(runtimeEventsPath, JSON.stringify(evt) + "\n")
  } catch {}
}

const appendMetric = (metric: any) => {
  try {
    ensureLogs()
    fs.appendFileSync(runtimeMetricsPath, JSON.stringify(metric) + "\n")
  } catch {}
}

const preferredProvider = () => String(process.env.TTS_PROVIDER || "").trim().toLowerCase()

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  try {
    const url = new URL(request.url)
    const text = url.searchParams.get('text')
    const lang = url.searchParams.get('lang') || 'vi'

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const sanitized = sanitizeTtsText(String(text), { lang })
    const pref = preferredProvider()
    if (pref === "off" || pref === "disabled") {
      return NextResponse.json({ error: "TTS is disabled" }, { status: 403 })
    }

    const trySupertone = async () => {
      if (!sanitized.trim()) return null
      const out = await supertoneTextToSpeech({ text: sanitized, lang })
      if (!out?.bytes?.length) return null
      appendEvent({ type: "tts_call", provider: out.provider, mode: "local", ts: new Date().toISOString(), chars: sanitized.length })
      appendMetric({ type: "tts_latency_ms", provider: out.provider, mode: "local", ms: Date.now() - t0, ts: new Date().toISOString() })
      const headers = new Headers()
      headers.set("Content-Type", out.contentType || "audio/mpeg")
      headers.set("Cache-Control", "no-store")
      return new Response(out.bytes, { status: 200, headers })
    }

    const tryGemini = async () => {
      const key = String(process.env.GEMINI_API_KEY || "").trim()
      if (!key || !sanitized.trim()) return null
      const model = (process.env.GEMINI_TTS_MODEL && String(process.env.GEMINI_TTS_MODEL).trim()) ? String(process.env.GEMINI_TTS_MODEL).trim() : undefined
      const voiceName = (process.env.GEMINI_TTS_VOICE && String(process.env.GEMINI_TTS_VOICE).trim()) ? String(process.env.GEMINI_TTS_VOICE).trim() : undefined
      const out = await geminiTextToSpeech({ apiKey: key, text: sanitized, model, voiceName }).catch(() => null)
      if (!out?.audioBase64) return null
      const bytes = Buffer.from(String(out.audioBase64), "base64")
      appendEvent({ type: "tts_call", provider: "gemini", mode: "cloud", ts: new Date().toISOString(), chars: sanitized.length })
      appendMetric({ type: "tts_latency_ms", provider: "gemini", mode: "cloud", ms: Date.now() - t0, ts: new Date().toISOString() })
      const headers = new Headers()
      headers.set("Content-Type", "audio/mpeg")
      headers.set("Cache-Control", "no-store")
      return new Response(bytes, { status: 200, headers })
    }

    if (pref === "gemini") {
      const r1 = await tryGemini()
      if (r1) return r1
      const r2 = await trySupertone()
      if (r2) return r2
    } else if (pref !== "backend") {
      const r1 = await trySupertone()
      if (r1) return r1
      const r2 = await tryGemini()
      if (r2) return r2
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
      appendEvent({ type: "tts_call", provider: "backend_stream", mode: "cpu_server", ts: new Date().toISOString(), chars: sanitized.length })
      appendMetric({ type: "tts_latency_ms", provider: "backend_stream", mode: "cpu_server", ms: Date.now() - t0, ts: new Date().toISOString() })
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
    appendEvent({ type: "tts_call", provider: "backend_file", mode: "cpu_server", ts: new Date().toISOString(), chars: sanitized.length })
    appendMetric({ type: "tts_latency_ms", provider: "backend_file", mode: "cpu_server", ms: Date.now() - t0, ts: new Date().toISOString() })
    return new Response(fileResp.body, { status: 200, headers })
  } catch (error) {
    console.error('Text-to-speech stream API error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
