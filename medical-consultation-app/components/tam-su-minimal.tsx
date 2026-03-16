"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  ts: number
}

const FRIEND_STYLE_KEY = "mcs_friend_style_v1"

export function TamSuMinimal({ initialConversationId }: { initialConversationId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      content: "Mình ở đây rồi. Bạn cứ nói chậm thôi, mình nghe.",
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null)
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash")
  const [friendStyle, setFriendStyle] = useState<"standard" | "deep">("deep")
  const [authToken, setAuthToken] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      setAuthToken(t && String(t).trim() ? String(t) : null)
    } catch {
      setAuthToken(null)
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FRIEND_STYLE_KEY)
      if (raw === "standard" || raw === "deep") setFriendStyle(raw)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(FRIEND_STYLE_KEY, friendStyle)
    } catch {}
  }, [friendStyle])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading])

  const send = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    try {
      const provider = (() => {
        try {
          const p = typeof window !== "undefined" ? localStorage.getItem("llm_provider") : null
          return p === "gemini" || p === "server" ? p : "server"
        } catch {
          return "server"
        }
      })()
      const payload = {
        model: selectedModel,
        message: text,
        conversation_id: conversationId,
        user_id: null,
        messages: messages
          .filter(m => m.role === "user" || m.role === "assistant")
          .map(m => ({ role: m.role, content: m.content })),
        provider,
        temperature: friendStyle === "deep" ? 0.9 : 0.75,
        max_tokens: friendStyle === "deep" ? 1200 : 800,
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`
      const resp = await fetch("/api/tam-su-chat", { method: "POST", headers, body: JSON.stringify(payload) })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      const content =
        (data as any)?.choices?.[0]?.message?.content ||
        (data as any)?.response ||
        "Mình đang gặp sự cố, bạn thử lại sau nhé."
      const aiMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: String(content), ts: Date.now() }
      setMessages(prev => [...prev, aiMsg])
      const newId =
        typeof (data as any)?.conversation_id === "string" && (data as any).conversation_id
          ? (data as any).conversation_id
          : conversationId
      if (newId && newId !== conversationId) {
        setConversationId(newId)
        try {
          const url = new URL(window.location.href)
          url.pathname = "/tam-su"
          url.searchParams.set("id", newId)
          window.history.replaceState(null, "", url.toString())
        } catch {}
      }
    } catch (e: any) {
      const msg = String(e?.message || "Mình đang gặp chút trục trặc, bạn thử lại sau nhé.")
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: msg, ts: Date.now() }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto p-4">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Tâm sự</div>
              <div className="text-xs text-muted-foreground">Chia sẻ điều bạn đang nghĩ, mình luôn lắng nghe.</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="flash">flash</option>
                <option value="pro">pro</option>
              </select>
              <select
                value={friendStyle}
                onChange={(e) => setFriendStyle(e.target.value as any)}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="standard">gọn</option>
                <option value="deep">sâu</option>
              </select>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t bg-white flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              placeholder="Bạn đang nghĩ gì, nói với mình nhé..."
              className="flex-1 border rounded-xl px-3 py-2 text-sm resize-none max-h-40"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => void send()}
              disabled={!canSend}
              className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white disabled:opacity-50"
              type="button"
            >
              {isLoading ? "..." : "Gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

