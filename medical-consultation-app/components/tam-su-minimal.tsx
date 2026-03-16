"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { deleteUserState, getUserState, upsertUserState } from "@/lib/user-state-client"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  ts: number
}

const FRIEND_STYLE_KEY = "mcs_friend_style_v1"
const FRIEND_CONV_TITLE_PREFIX = "friend_conv_title_"
const FRIEND_CONV_MESSAGES_PREFIX = "friend_conv_messages_"

type ConversationItem = { id: string; title: string; last_active: number }
type StoredMessage = { id: string; content: string; isUser: boolean; timestamp: string }

const nowTs = () => Date.now()
const newConvId = () => `friend-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`

const toStored = (msgs: Message[]): StoredMessage[] =>
  msgs.map(m => ({
    id: m.id,
    content: m.content,
    isUser: m.role === "user",
    timestamp: new Date(m.ts || nowTs()).toISOString()
  }))

const fromStored = (arr: any[]): Message[] =>
  (Array.isArray(arr) ? arr : [])
    .map((m: any) => {
      const ts = (() => {
        try {
          const t = new Date(m?.timestamp)
          const v = t.getTime()
          return Number.isFinite(v) ? v : nowTs()
        } catch {
          return nowTs()
        }
      })()
      return {
        id: String(m?.id || `m-${ts}`),
        role: m?.isUser ? "user" : "assistant",
        content: String(m?.content || ""),
        ts
      } as Message
    })
    .filter(m => m.content.trim().length > 0)

const loadLocalMessages = (id: string): Message[] => {
  try {
    const raw = localStorage.getItem(`${FRIEND_CONV_MESSAGES_PREFIX}${id}`)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return fromStored(arr)
  } catch {
    return []
  }
}

const saveLocalMessages = (id: string, msgs: Message[]) => {
  try {
    localStorage.setItem(`${FRIEND_CONV_MESSAGES_PREFIX}${id}`, JSON.stringify(toStored(msgs)))
  } catch {}
}

const loadLocalTitle = (id: string) => {
  try {
    const t = localStorage.getItem(`${FRIEND_CONV_TITLE_PREFIX}${id}`)
    return (t && String(t).trim()) ? String(t).trim() : "Tâm sự"
  } catch {
    return "Tâm sự"
  }
}

const saveLocalTitle = (id: string, title: string) => {
  try {
    localStorage.setItem(`${FRIEND_CONV_TITLE_PREFIX}${id}`, String(title || "Tâm sự"))
  } catch {}
}

const deleteLocalConversation = (id: string) => {
  try {
    localStorage.removeItem(`${FRIEND_CONV_MESSAGES_PREFIX}${id}`)
    localStorage.removeItem(`${FRIEND_CONV_TITLE_PREFIX}${id}`)
  } catch {}
}

const loadLocalConversations = (): ConversationItem[] => {
  try {
    const ids = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || ""
      if (key.startsWith(FRIEND_CONV_MESSAGES_PREFIX)) ids.add(key.slice(FRIEND_CONV_MESSAGES_PREFIX.length))
      if (key.startsWith(FRIEND_CONV_TITLE_PREFIX)) ids.add(key.slice(FRIEND_CONV_TITLE_PREFIX.length))
    }
    const out: ConversationItem[] = []
    for (const id of ids) {
      const title = loadLocalTitle(id)
      const msgs = loadLocalMessages(id)
      const last = msgs.length ? (msgs[msgs.length - 1].ts || nowTs()) : 0
      out.push({ id, title, last_active: last })
    }
    out.sort((a, b) => (b.last_active || 0) - (a.last_active || 0))
    return out
  } catch {
    return []
  }
}

export function TamSuMinimal({ initialConversationId }: { initialConversationId?: string }) {
  const greetingMsg = useMemo<Message>(() => ({
    id: "m0",
    role: "assistant",
    content: "Mình ở đây rồi. Bạn cứ nói chậm thôi, mình nghe.",
    ts: nowTs(),
  }), [])

  const [messages, setMessages] = useState<Message[]>([
    greetingMsg,
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null)
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash")
  const [friendStyle, setFriendStyle] = useState<"standard" | "deep">("deep")
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>([6, 10, 16, 10, 6])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const vizIntervalRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

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
    let cancelled = false
    ;(async () => {
      const items = await getUserState("friend_conversations")
      if (cancelled) return
      for (const it of items) {
        const id = String(it?.key || "").trim()
        const v = it?.value
        if (!id || !v) continue
        try {
          const title = typeof v?.title === "string" ? v.title : ""
          const msgs = Array.isArray(v?.messages) ? v.messages : null
          if (title) saveLocalTitle(id, title)
          if (msgs) localStorage.setItem(`${FRIEND_CONV_MESSAGES_PREFIX}${id}`, JSON.stringify(msgs))
        } catch {}
      }
      try {
        setConversations(loadLocalConversations())
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try {
      setConversations(loadLocalConversations())
    } catch {}
  }, [])

  useEffect(() => {
    if (!initialConversationId) return
    setConversationId(initialConversationId)
    try {
      const msgs = loadLocalMessages(initialConversationId)
      if (msgs.length) setMessages(msgs)
      else setMessages([greetingMsg])
    } catch {
      setMessages([greetingMsg])
    }
  }, [initialConversationId, greetingMsg])

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

  const suggestedQuestions = [
    "Hôm nay bạn thấy thế nào?",
    "Điều gì đang khiến bạn bận tâm?",
    "Bạn cần ai đó lắng nghe không?",
    "Bạn mong muốn thay đổi điều gì sớm nhất?"
  ]

  const updateUrlId = (id: string | null) => {
    try {
      const url = new URL(window.location.href)
      url.pathname = "/tam-su"
      if (id) url.searchParams.set("id", id)
      else url.searchParams.delete("id")
      window.history.replaceState(null, "", url.toString())
    } catch {}
  }

  const refreshLocalConversations = () => {
    try {
      setConversations(loadLocalConversations())
    } catch {}
  }

  const persistConversation = async (id: string) => {
    try {
      const title = loadLocalTitle(id)
      const raw = localStorage.getItem(`${FRIEND_CONV_MESSAGES_PREFIX}${id}`)
      const messagesStored = raw ? JSON.parse(raw) : []
      await upsertUserState("friend_conversations", id, { title, messages: messagesStored })
    } catch {}
  }

  const openConversation = (id: string) => {
    setConversationId(id)
    updateUrlId(id)
    const msgs = loadLocalMessages(id)
    setMessages(msgs.length ? msgs : [greetingMsg])
    setRenamingId(null)
    setRenameValue("")
  }

  const createConversation = () => {
    const id = newConvId()
    saveLocalTitle(id, "Tâm sự")
    saveLocalMessages(id, [greetingMsg])
    refreshLocalConversations()
    openConversation(id)
    void persistConversation(id)
  }

  const renameConversation = (id: string) => {
    const next = (renameValue || "").trim() || "Tâm sự"
    saveLocalTitle(id, next)
    setRenamingId(null)
    setRenameValue("")
    refreshLocalConversations()
    void persistConversation(id)
  }

  const deleteConversation = (id: string) => {
    deleteLocalConversation(id)
    refreshLocalConversations()
    if (conversationId === id) {
      setConversationId(null)
      updateUrlId(null)
      setMessages([greetingMsg])
    }
    void deleteUserState("friend_conversations", id)
  }

  const speak = async (text: string) => {
    const t = String(text || "").trim()
    if (!t) return
    try {
      const resp = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, lang: "vi" })
      })
      if (!resp.ok) return
      const j = await resp.json()
      const au = j?.audio_url || j?.download_url || null
      if (!au) return
      setLastAudioUrl(String(au))
      const audio = new Audio(String(au))
      try { await audio.play() } catch {}
    } catch {}
  }

  const sendText = async (textInput: string, speakAssistant: boolean) => {
    const text = (textInput || "").trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: `u-${nowTs()}`, role: "user", content: text, ts: nowTs() }
    const ensuredId = conversationId || newConvId()
    if (!conversationId) {
      setConversationId(ensuredId)
      updateUrlId(ensuredId)
      saveLocalTitle(ensuredId, "Tâm sự")
    }
    const snapshot = [...messages, userMsg]
    setMessages(snapshot)
    saveLocalMessages(ensuredId, snapshot)
    refreshLocalConversations()
      void persistConversation(ensuredId)

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
        conversation_id: ensuredId,
        user_id: null,
        messages: snapshot.map(m => ({ role: m.role, content: m.content })),
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
      const aiMsg: Message = { id: `a-${nowTs()}`, role: "assistant", content: String(content), ts: nowTs() }
      const finalSnap = [...snapshot, aiMsg]
      setMessages(finalSnap)

      const newId =
        typeof (data as any)?.conversation_id === "string" && (data as any).conversation_id
          ? (data as any).conversation_id
          : ensuredId
      if (newId && newId !== ensuredId) {
        setConversationId(newId)
        updateUrlId(newId)
        saveLocalTitle(newId, loadLocalTitle(ensuredId))
        saveLocalMessages(newId, finalSnap)
        if (newId !== ensuredId) deleteLocalConversation(ensuredId)
        void persistConversation(newId)
      } else {
        saveLocalMessages(ensuredId, finalSnap)
        void persistConversation(ensuredId)
      }

      try {
        const baseText = text.trim() || String(content).trim()
        const title = baseText.split(/\s+/).slice(0, 6).join(" ") || "Tâm sự"
        saveLocalTitle(newId || ensuredId, title)
      } catch {}
      refreshLocalConversations()

      if (speakAssistant) await speak(String(content))
    } catch (e: any) {
      const msg = String(e?.message || "Mình đang gặp chút trục trặc, bạn thử lại sau nhé.")
      const errMsg: Message = { id: `e-${nowTs()}`, role: "assistant", content: msg, ts: nowTs() }
      const finalSnap = [...snapshot, errMsg]
      setMessages(finalSnap)
      saveLocalMessages(ensuredId, finalSnap)
      refreshLocalConversations()
      void persistConversation(ensuredId)
    } finally {
      setIsLoading(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    await sendText(text, false)
  }

  const startRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      try {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
        const ctx: AudioContext = new AC()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        audioCtxRef.current = ctx
        analyserRef.current = analyser
        vizIntervalRef.current = window.setInterval(() => {
          const an = analyserRef.current
          if (!an) return
          const data = new Uint8Array(an.frequencyBinCount)
          an.getByteFrequencyData(data)
          const seg = Math.max(1, Math.floor(data.length / 5))
          const lvls = [0, 1, 2, 3, 4].map(i => {
            const slice = data.slice(i * seg, (i + 1) * seg)
            const avg = slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length)
            return Math.max(4, Math.min(24, Math.round((avg / 255) * 24)))
          })
          setLevels(lvls)
        }, 50)
      } catch {}

      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          const formData = new FormData()
          formData.append("audio_file", blob, "voice.webm")
          const resp = await fetch("/api/speech-to-text", { method: "POST", body: formData })
          const j = await resp.json().catch(() => null)
          const transcript = (j && j.success && typeof j.text === "string") ? j.text.trim() : ""
          if (transcript) {
            await sendText(transcript, true)
          }
        } catch {}
        try {
          if (vizIntervalRef.current) window.clearInterval(vizIntervalRef.current)
        } catch {}
        try {
          analyserRef.current = null
          if (audioCtxRef.current) audioCtxRef.current.close()
        } catch {}
        setIsRecording(false)
      }
      mr.start()
      setIsRecording(true)
    } catch {
      setIsRecording(false)
    }
  }

  const stopRecording = async () => {
    if (!isRecording) return
    try {
      mediaRecorderRef.current?.stop()
      const tracks = (mediaRecorderRef.current as any)?.stream?.getTracks?.() || []
      for (const t of tracks) {
        try { t.stop() } catch {}
      }
    } catch {
      setIsRecording(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex min-h-[72vh]">
          {showSidebar ? (
            <div className="w-72 border-r bg-white flex flex-col">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Hội thoại</div>
                <div className="flex items-center gap-2">
                  <button className="text-xs px-2 py-1 border rounded" type="button" onClick={createConversation}>Mới</button>
                  <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => setShowSidebar(false)}>Ẩn</button>
                </div>
              </div>
              <div className="p-2 overflow-y-auto flex-1">
                {conversations.length ? (
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border ${conversationId === c.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <div className="text-sm font-medium truncate">{c.title || "Tâm sự"}</div>
                        <div className="text-xs text-muted-foreground">{c.last_active ? new Date(c.last_active).toLocaleString("vi-VN") : ""}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground px-2 py-3">Chưa có hội thoại.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-10 border-r flex items-start justify-center p-2">
              <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => setShowSidebar(true)}>≡</button>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <div className="min-w-0">
                {conversationId && renamingId === conversationId ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="text-sm border rounded px-2 py-1 w-64 max-w-full"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      placeholder="Đặt tên hội thoại"
                    />
                    <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => renameConversation(conversationId)}>Lưu</button>
                    <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => { setRenamingId(null); setRenameValue("") }}>Hủy</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold truncate">{conversationId ? loadLocalTitle(conversationId) : "Tâm sự"}</div>
                    {conversationId ? (
                      <>
                        <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => { setRenamingId(conversationId); setRenameValue(loadLocalTitle(conversationId)) }}>Đổi tên</button>
                        <button className="text-xs px-2 py-1 border rounded text-red-600" type="button" onClick={() => deleteConversation(conversationId)}>Xóa</button>
                      </>
                    ) : null}
                  </div>
                )}
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
                <button className="text-xs px-2 py-1 border rounded" type="button" onClick={() => setVoiceMode(v => !v)}>
                  {voiceMode ? "Voice" : "Chat"}
                </button>
                {voiceMode ? (
                  <button
                    className={`text-xs px-2 py-1 rounded ${isRecording ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}
                    type="button"
                    onClick={() => { if (isRecording) void stopRecording(); else void startRecording() }}
                  >
                    {isRecording ? "Dừng" : "Ghi âm"}
                  </button>
                ) : null}
                {voiceMode && lastAudioUrl ? (
                  <a className="text-xs px-2 py-1 border rounded" href={lastAudioUrl} target="_blank" rel="noreferrer">Nghe</a>
                ) : null}
              </div>
            </div>

            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {suggestedQuestions.slice(0, 4).map((q) => (
                <button key={q} type="button" className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-slate-50" onClick={() => setInput(q)}>
                  {q}
                </button>
              ))}
              {voiceMode && isRecording ? (
                <div className="flex items-end gap-1 h-6 ml-2">
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[0] || 6))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[1] || 10))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[2] || 16))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[3] || 10))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[4] || 6))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                </div>
              ) : null}
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {m.content}
                    <div className={`text-[11px] mt-1 ${m.role === "user" ? "text-white/80" : "text-slate-500"}`}>
                      {new Date(m.ts || nowTs()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
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
    </div>
  )
}
