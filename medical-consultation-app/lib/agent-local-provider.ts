import { z } from "zod"

const OpenAIChatResponseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().optional(),
      }).passthrough().optional(),
    }).passthrough()
  ).optional(),
}).passthrough()

function firstJsonObject(text: string) {
  const s = String(text || "").trim()
  if (!s) return null
  const start = s.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) {
        esc = false
      } else if (ch === "\\") {
        esc = true
      } else if (ch === "\"") {
        inStr = false
      }
      continue
    }
    if (ch === "\"") {
      inStr = true
      continue
    }
    if (ch === "{") depth++
    if (ch === "}") depth--
    if (depth === 0) return s.slice(start, i + 1)
  }
  return null
}

export async function runLocalAgent(opts: {
  url: string
  model?: string
  message: string
  history?: Array<{ role?: string; content?: string }>
  allowPaths?: string[]
}): Promise<{ text: string; model?: string; json: any | null }> {
  const url = String(opts.url || "").trim()
  if (!url) return { text: "", model: undefined, json: null }

  const allow = Array.isArray(opts.allowPaths) && opts.allowPaths.length ? opts.allowPaths : [
    "/sang-loc",
    "/tri-lieu",
    "/nhac-nho",
    "/tin-tuc-y-khoa",
    "/tam-su",
    "/tu-van",
    "/bac-si",
    "/doctor",
    "/ke-hoach",
  ]

  const system = [
    "Bạn là AI agent cho ứng dụng tư vấn y tế & tâm lý.",
    "Nhiệm vụ: xuất ra một JSON object DUY NHẤT để UI có thể thực thi hành động.",
    "Không bọc markdown, không giải thích ngoài JSON.",
    "Schema JSON:",
    "{",
    "  \"response\": \"string\",",
    "  \"actions\": [",
    "    { \"type\": \"navigate\", \"args\": { \"path\": \"/...\" } },",
    "    { \"type\": \"speak\", \"args\": { \"text\": \"...\" } }",
    "  ]",
    "}",
    "Quy tắc actions:",
    "- Nếu cần điều hướng, dùng type=navigate và path bắt đầu bằng /.",
    "- Chỉ dùng path nằm trong allowlist.",
    `Allowlist: ${allow.join(", ")}`,
    "- Nếu cần đọc to, dùng type=speak với text ngắn gọn.",
    "- Nếu không cần hành động, actions = [].",
  ].join("\n")

  const messages = [
    { role: "system", content: system },
    ...(Array.isArray(opts.history) ? opts.history : []).map((m) => ({ role: String(m?.role || "user"), content: String(m?.content || "") })),
    { role: "user", content: String(opts.message || "") },
  ]

  const body = {
    model: (typeof opts.model === "string" && opts.model.trim()) ? opts.model.trim() : "local-agent",
    messages,
    temperature: 0.2,
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const t = await resp.text().catch(() => "")
    throw new Error(`Local LLM error: ${resp.status} ${resp.statusText} ${t}`)
  }

  const raw = await resp.json().catch(() => null)
  const parsed = OpenAIChatResponseSchema.safeParse(raw)
  const model = parsed.success ? parsed.data.model : undefined
  const content = parsed.success ? (parsed.data.choices?.[0]?.message?.content || "") : ""
  const text = String(content || "").trim()
  if (!text) return { text: "", model, json: null }

  const tryJson = (() => {
    try {
      return JSON.parse(text)
    } catch {}
    const block = firstJsonObject(text)
    if (!block) return null
    try {
      return JSON.parse(block)
    } catch {}
    return null
  })()

  return { text, model, json: tryJson }
}
