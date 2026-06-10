const toBaseUrl = (v: any) => String(v || "").trim().replace(/\/$/, "")

const readSupertoneBaseUrl = () => {
  const env =
    toBaseUrl(process.env.SUPERTONIC_TTS_URL) ||
    toBaseUrl(process.env.SUPERTONIC_SERVER_URL) ||
    toBaseUrl(process.env.SUPERTONIC_URL)
  return env || ""
}

export async function supertoneTextToSpeech(opts: {
  text: string
  lang?: string
  timeoutMs?: number
}) {
  const base = readSupertoneBaseUrl()
  const text = String(opts.text || "").trim()
  const lang = String(opts.lang || "vi").trim() || "vi"
  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 12000
  if (!base || !text) return null

  const model = String(process.env.SUPERTONIC_TTS_MODEL || process.env.SUPERTONIC_MODEL || "supertonic-3").trim() || "supertonic-3"
  const voice = String(process.env.SUPERTONIC_TTS_VOICE || process.env.SUPERTONIC_VOICE || "M1").trim() || "M1"
  const speed = Number(process.env.SUPERTONIC_TTS_SPEED || 1.0)

  const tryFetch = async (url: string, init: RequestInit) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal })
      if (!resp.ok) return null
      const ab = await resp.arrayBuffer()
      const bytes = new Uint8Array(ab)
      if (!bytes.byteLength) return null
      const ct = String(resp.headers.get("content-type") || "").trim()
      return { bytes, contentType: ct || "audio/mpeg" }
    } catch {
      return null
    } finally {
      clearTimeout(id)
    }
  }

  const openAiPayload = {
    model,
    input: text,
    voice,
    response_format: "mp3",
    speed: Number.isFinite(speed) ? speed : 1.0,
  }

  const openAi = await tryFetch(`${base}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(openAiPayload),
  })
  if (openAi) return { ...openAi, provider: "supertone" as const }

  const native = await tryFetch(`${base}/v1/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  })
  if (native) return { ...native, provider: "supertone" as const }

  return null
}
