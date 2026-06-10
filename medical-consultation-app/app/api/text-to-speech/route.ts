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

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''
    const lang = typeof body?.lang === "string" ? body.lang : "vi"
    const sanitized = sanitizeTtsText(String(text), { lang })

    const pref = preferredProvider()
    if (pref === "off" || pref === "disabled") {
      return NextResponse.json({ error: "TTS is disabled" }, { status: 403 })
    }

    const trySupertone = async () => {
      if (!sanitized.trim()) return null
      const out = await supertoneTextToSpeech({ text: sanitized, lang })
      if (!out?.bytes?.length) return null
      const b64 = Buffer.from(out.bytes).toString("base64")
      appendEvent({ type: "tts_call", provider: out.provider, mode: "local", ts: new Date().toISOString(), chars: sanitized.length })
      appendMetric({ type: "tts_latency_ms", provider: out.provider, mode: "local", ms: Date.now() - t0, ts: new Date().toISOString() })
      return NextResponse.json({ audio_url: `data:${out.contentType};base64,${b64}`, provider: out.provider })
    }

    const tryGemini = async () => {
      const key = String(process.env.GEMINI_API_KEY || "").trim()
      if (!key || !sanitized.trim()) return null
      const model = (process.env.GEMINI_TTS_MODEL && String(process.env.GEMINI_TTS_MODEL).trim()) ? String(process.env.GEMINI_TTS_MODEL).trim() : undefined
      const voiceName = (process.env.GEMINI_TTS_VOICE && String(process.env.GEMINI_TTS_VOICE).trim()) ? String(process.env.GEMINI_TTS_VOICE).trim() : undefined
      const out = await geminiTextToSpeech({ apiKey: key, text: sanitized, model, voiceName })
      if (!out.audioBase64) return null
      appendEvent({ type: "tts_call", provider: "gemini", mode: "cloud", ts: new Date().toISOString(), chars: sanitized.length })
      appendMetric({ type: "tts_latency_ms", provider: "gemini", mode: "cloud", ms: Date.now() - t0, ts: new Date().toISOString() })
      return NextResponse.json({ audio_url: `data:audio/mpeg;base64,${out.audioBase64}`, provider: "gemini" })
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
    appendEvent({ type: "tts_call", provider: "backend", mode: "cpu_server", ts: new Date().toISOString(), chars: sanitized.length })
    appendMetric({ type: "tts_latency_ms", provider: "backend", mode: "cpu_server", ms: Date.now() - t0, ts: new Date().toISOString() })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 })
  }
}
