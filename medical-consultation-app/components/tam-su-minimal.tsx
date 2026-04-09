"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { deleteUserState, getUserState, upsertUserState } from "@/lib/user-state-client"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, Menu, X, Music, Play, ExternalLink, User } from "lucide-react"
import { consumePendingScreeningContext, getLastScreening, type ScreeningResult } from "@/lib/screening-store"
import { loadLocalDoctorPrivate } from "@/lib/doctor-profile-store"
import { PageAiInsight } from "@/components/page-ai-insight"
import { InlineEmbed } from "@/components/inline-embed"
import { ChatMusicRecommendations } from "@/components/music/chat-music-recommendations"

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

const fromStored = (arr: any[]): Message[] => {
  const used = new Set<string>()
  return (Array.isArray(arr) ? arr : [])
    .map((m: any, idx: number) => {
      const ts = (() => {
        try {
          const t = new Date(m?.timestamp)
          const v = t.getTime()
          return Number.isFinite(v) ? v : nowTs()
        } catch {
          return nowTs()
        }
      })()
      const base = String(m?.id || `m-${ts}-${idx}`)
      let id = base
      if (used.has(id)) {
        let n = 2
        while (used.has(`${base}-${n}`)) n++
        id = `${base}-${n}`
      }
      used.add(id)
      return {
        id,
        role: m?.isUser ? "user" : "assistant",
        content: String(m?.content || ""),
        ts
      } as Message
    })
    .filter(m => m.content.trim().length > 0)
}

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

  const [headerPad, setHeaderPad] = useState<string>("6rem")
  useEffect(() => {
    const updatePad = () => {
      try {
        const el = typeof window !== "undefined" ? (document.querySelector("[data-site-header]") as HTMLElement | null) : null
        const bottom = el ? el.getBoundingClientRect().bottom : 64
        const extra = 16
        setHeaderPad(`${Math.round(bottom + extra)}px`)
      } catch {}
    }
    updatePad()
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updatePad)
      window.addEventListener("scroll", updatePad, { passive: true } as any)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updatePad)
        window.removeEventListener("scroll", updatePad)
      }
    }
  }, [])

  const [messages, setMessages] = useState<Message[]>([
    greetingMsg,
  ])
  const [sosOpen, setSosOpen] = useState(false)
  const [sosHotlines, setSosHotlines] = useState<Array<{ label: string; number: string }>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null)
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash")
  const [friendStyle, setFriendStyle] = useState<"standard" | "deep">("deep")
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [showSidebar, setShowSidebar] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth >= 640 : true))
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>([6, 10, 16, 10, 6])
  const [musicRecommendations, setMusicRecommendations] = useState<Array<{ videoId: string; title: string; artist: string; mood: string }> | null>(null)
  const [musicMessage, setMusicMessage] = useState<string | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const vizIntervalRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 639px)")
    const update = () => setIsMobile(!!mq.matches)
    update()
    try {
      mq.addEventListener("change", update)
      return () => mq.removeEventListener("change", update)
    } catch {
      mq.addListener(update)
      return () => mq.removeListener(update)
    }
  }, [])

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

  const buildScreeningSeed = (r: ScreeningResult) => {
    const parts: string[] = []
    const title = String(r?.title || "").trim()
    const level = String(r?.level || "").trim()
    const desc = String(r?.description || "").trim()
    const score = Number(r?.score)
    const recs = Array.isArray(r?.recommendations) ? r.recommendations.map((s) => String(s || "").trim()).filter(Boolean) : []
    if (title) parts.push(`Mình thấy bạn vừa hoàn thành ${title}.`)
    if (level) parts.push(`Mức: ${level}.`)
    if (Number.isFinite(score)) parts.push(`Điểm: ${score}.`)
    if (desc) parts.push(desc)
    if (recs.length) parts.push(`Gợi ý: ${recs.slice(0, 2).join(" • ")}.`)
    parts.push("Bạn muốn bắt đầu từ điều gì đang khó nhất với bạn lúc này?")
    return parts.join(" ").replace(/\s+/g, " ").trim()
  }

  useEffect(() => {
    if (initialConversationId) return
    try {
      const pending = consumePendingScreeningContext()
      const last = pending || getLastScreening()
      if (!last) return
      const age = Date.now() - Number(last.ts || 0)
      if (!pending && !(age >= 0 && age <= 6 * 60 * 60 * 1000)) return
      const content = buildScreeningSeed(last)
      if (!content) return
      setMessages([
        {
          id: `seed-${Date.now().toString(16)}`,
          role: "assistant",
          content,
          ts: nowTs(),
        },
      ])
    } catch {}
  }, [initialConversationId])

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

    const userMsg: Message = { id: `u-${nowTs()}-${Math.random().toString(16).slice(2)}`, role: "user", content: text, ts: nowTs() }
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
        systemPrompt: (() => {
          try {
            const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
            if (role !== "doctor") return undefined
            const priv = loadLocalDoctorPrivate()
            const p = String(priv?.assistantPrompt || "").trim()
            return p ? p : undefined
          } catch {
            return undefined
          }
        })(),
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`
      const resp = await fetch("/api/tam-su-chat", { method: "POST", headers, body: JSON.stringify(payload) })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      const md = (data as any)?.metadata
      if (md && (md as any)?.sos) {
        try {
          const hs = Array.isArray((md as any)?.hotlines) ? (md as any).hotlines : []
          setSosHotlines(hs.map((h: any) => ({ label: String(h?.label || ""), number: String(h?.number || "") })).filter((h: any) => h.label && h.number))
        } catch {
          setSosHotlines([])
        }
        setSosOpen(true)
      }
      
      // Handle music recommendations
      const musicData = (data as any)?.music
      if (musicData && Array.isArray(musicData.recommendations) && musicData.recommendations.length > 0) {
        setMusicRecommendations(musicData.recommendations)
        setMusicMessage(musicData.message || "Đây là một số nhạc thư giãn cho bạn:")
      }
      const content =
        (data as any)?.choices?.[0]?.message?.content ||
        (data as any)?.response ||
        "Mình đang gặp sự cố, bạn thử lại sau nhé."
      const aiMsg: Message = { id: `a-${nowTs()}-${Math.random().toString(16).slice(2)}`, role: "assistant", content: String(content), ts: nowTs() }
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
      const errMsg: Message = { id: `e-${nowTs()}-${Math.random().toString(16).slice(2)}`, role: "assistant", content: msg, ts: nowTs() }
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50" style={{ paddingTop: headerPad }}>
      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent className="border-red-300 bg-red-50">
          <DialogHeader>
            <DialogTitle className="text-red-700">Khẩn cấp</DialogTitle>
            <DialogDescription className="text-red-600">
              Nếu bạn đang có nguy cơ tự làm hại bản thân hoặc người khác, hãy liên hệ hỗ trợ ngay
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-800">
            <div className="space-y-1">
              {(sosHotlines.length ? sosHotlines : [{ label: "Cấp cứu", number: "115" }, { label: "Bảo vệ trẻ em", number: "111" }]).map((h) => (
                <div key={`${h.label}-${h.number}`} className="font-medium">{h.label}: {h.number}</div>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-800">Nếu bạn ở một mình, hãy gọi người thân/bạn bè và ở nơi an toàn.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSosOpen(false)}>Đã hiểu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="w-full h-full px-2 sm:px-4 py-3 sm:py-4">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex h-full">
          {!isMobile && showSidebar ? (
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
          ) : null}

          {isMobile ? (
            <Drawer open={showSidebar} onOpenChange={setShowSidebar} direction="left">
              <DrawerContent className="data-[vaul-drawer-direction=left]:w-full data-[vaul-drawer-direction=left]:max-w-none data-[vaul-drawer-direction=left]:border-r p-0">
                <div className="sr-only">
                  <DrawerTitle>Lịch sử tâm sự</DrawerTitle>
                </div>
                <div className="h-[100dvh] bg-white dark:bg-slate-900 flex flex-col">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Lịch sử tâm sự</div>
                    <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition" type="button" onClick={() => setShowSidebar(false)}>
                      <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                  <div className="p-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                    <button className="flex-1 text-sm px-4 py-2.5 rounded-lg bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 font-medium transition" type="button" onClick={createConversation}>Tâm sự mới</button>
                    <button className="text-sm px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 hover:border-slate-300 dark:hover:border-slate-600 transition" type="button" onClick={refreshLocalConversations}>⟲</button>
                  </div>
                  <div className="px-4 pb-6 overflow-y-auto flex-1 space-y-2">
                    {conversations.length ? (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { openConversation(c.id); setShowSidebar(false) }}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition ${conversationId === c.id ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                        >
                          <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-50">{c.title || "Tâm sự"}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.last_active ? new Date(c.last_active).toLocaleString("vi-VN") : "Vừa mới"}</div>
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Chưa có hội thoại nào. Bắt đầu tâm sự mới!</div>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : null}

          <div className="flex-1 flex flex-col">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto">
              <div className="min-w-0 flex-1">
                {conversationId && renamingId === conversationId ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <input
                      className="text-xs sm:text-sm border rounded px-2 py-1 w-40 sm:w-64 max-w-full"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      placeholder="Đặt tên hội thoại"
                    />
                    <button className="text-xs px-2 py-1 border rounded whitespace-nowrap" type="button" onClick={() => renameConversation(conversationId)}>Lưu</button>
                    <button className="text-xs px-2 py-1 border rounded whitespace-nowrap" type="button" onClick={() => { setRenamingId(null); setRenameValue("") }}>Hủy</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">{conversationId ? loadLocalTitle(conversationId) : "Tâm sự"}</div>
                    {conversationId ? (
                      <>
                        <button className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:border-blue-300 dark:hover:border-blue-600 transition whitespace-nowrap" type="button" onClick={() => { setRenamingId(conversationId); setRenameValue(loadLocalTitle(conversationId)) }}>✏️</button>
                        <button className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition whitespace-nowrap" type="button" onClick={() => deleteConversation(conversationId)}>🗑️</button>
                      </>
                    ) : null}
                  </div>
                )}
                <div className="text-xs text-slate-600 dark:text-slate-400">Chia sẻ cảm xúc, tâm sự</div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {isMobile ? (
                  <button className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors" type="button" onClick={() => setShowSidebar(true)} aria-label="Mo lich su">
                    <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                  </button>
                ) : null}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as any)}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2 border border-border rounded-xl bg-card text-foreground font-medium hover:bg-secondary transition-colors cursor-pointer"
                >
                  <option value="flash">flash</option>
                  <option value="pro">pro</option>
                </select>
                <select
                  value={friendStyle}
                  onChange={(e) => setFriendStyle(e.target.value as any)}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-2 border border-border rounded-xl bg-card text-foreground font-medium hover:bg-secondary transition-colors cursor-pointer"
                >
                  <option value="standard">gon</option>
                  <option value="deep">sau</option>
                </select>
                <button 
                  className="text-xs px-3 py-2 border border-border rounded-xl bg-card text-foreground font-medium hover:bg-secondary transition-colors" 
                  type="button" 
                  onClick={() => setVoiceMode(v => !v)}
                >
                  {voiceMode ? "Chat" : "Voice"}
                </button>
                {voiceMode ? (
                  <button
                    className={`text-xs px-3 py-2 rounded-xl font-medium transition-all ${isRecording ? "bg-destructive text-destructive-foreground shadow-md active:scale-95" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                    type="button"
                    onClick={() => { if (isRecording) void stopRecording(); else void startRecording() }}
                  >
                    {isRecording ? "Dung" : "Ghi am"}
                  </button>
                ) : null}
                {voiceMode && lastAudioUrl ? (
                  <a className="text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-medium hover:border-blue-300 dark:hover:border-blue-600 transition" href={lastAudioUrl} target="_blank" rel="noreferrer">▶ Nghe</a>
                ) : null}
              </div>
            </div>

            <div className="px-2 sm:px-4 py-2 sm:py-3 flex gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border bg-secondary/30">
              {suggestedQuestions.slice(0, 4).map((q) => (
                <button 
                  key={q} 
                  type="button" 
                  className="shrink-0 text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all font-medium shadow-sm" 
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
              {voiceMode && isRecording ? (
                <div className="flex items-end gap-1 h-6 ml-2 px-3 py-1 bg-accent/10 rounded-full">
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[0] || 6))) }px` }} className="w-1 bg-accent rounded-full transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[1] || 10))) }px` }} className="w-1 bg-accent rounded-full transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[2] || 16))) }px` }} className="w-1 bg-accent rounded-full transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[3] || 10))) }px` }} className="w-1 bg-accent rounded-full transition-all duration-50"></div>
                  <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[4] || 6))) }px` }} className="w-1 bg-accent rounded-full transition-all duration-50"></div>
                </div>
              ) : null}
            </div>

            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto bg-background custom-scrollbar">
              <PageAiInsight
                pageContext="emotional_support"
                userQuestion={messages.length > 0 ? messages[messages.length - 1]?.role === "user" ? messages[messages.length - 1]?.content : undefined : undefined}
                conversationHistory={messages.map(m => ({ role: m.role, content: m.content }))}
              />
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                    <Heart className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Nguoi Ban Lang Nghe</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">Khong gian an toan de ban chia se cam xuc va suy nghi cua minh. Toi luon o day lang nghe ban.</p>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex items-end gap-3 animate-message-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role !== "user" && (
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center shadow-sm">
                          <Heart className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user" 
                            ? "chat-bubble-user" 
                            : "chat-bubble-bot border border-border/50"
                        }`}
                      >
                        {m.content}
                        <div className={`text-xs mt-2 opacity-60 ${m.role === "user" ? "text-white/80" : "text-muted-foreground"}`}>
                          {new Date(m.ts || nowTs()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {m.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Music Recommendations */}
                  {musicRecommendations && musicRecommendations.length > 0 && (
                    <div className="flex justify-start animate-message-in">
                      <div className="max-w-[95%] sm:max-w-[85%] rounded-2xl px-4 py-4 bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <Music className="h-4 w-4 text-accent" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{musicMessage || "Nhac goi y cho ban"}</span>
                          <button 
                            onClick={() => { setMusicRecommendations(null); setPlayingVideoId(null) }}
                            className="ml-auto p-1.5 rounded-full hover:bg-secondary transition-colors"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        
                        {/* Playing video */}
                        {playingVideoId && (
                          <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
                            <iframe
                              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0`}
                              className="w-full aspect-video"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title="Music Player"
                            />
                          </div>
                        )}
                        
                        {/* Music list */}
                        <div className="space-y-2">
                          {musicRecommendations.map((track, idx) => (
                            <div 
                              key={`${track.videoId}-${idx}`}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                                playingVideoId === track.videoId 
                                  ? "bg-accent/20 border border-accent/40 shadow-sm" 
                                  : "bg-card hover:bg-secondary border border-transparent"
                              }`}
                              onClick={() => setPlayingVideoId(playingVideoId === track.videoId ? null : track.videoId)}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                playingVideoId === track.videoId ? "bg-accent" : "bg-accent/20"
                              }`}>
                                {playingVideoId === track.videoId ? (
                                  <div className="flex items-end gap-0.5 h-4">
                                    <div className="w-1 bg-white animate-pulse rounded-full" style={{ height: "60%" }} />
                                    <div className="w-1 bg-white animate-pulse rounded-full" style={{ height: "100%", animationDelay: "0.2s" }} />
                                    <div className="w-1 bg-white animate-pulse rounded-full" style={{ height: "40%", animationDelay: "0.4s" }} />
                                  </div>
                                ) : (
                                  <Play className="h-4 w-4 text-accent" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                              </div>
                              <a 
                                href={`https://www.youtube.com/watch?v=${track.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Thinking Animation */}
                  {isLoading && (
                    <div className="flex items-end gap-3 animate-message-in">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center shadow-sm">
                        <Heart className="h-4 w-4 text-white animate-pulse" />
                      </div>
                      <div className="chat-bubble-bot border border-border/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">Dang suy nghi...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={endRef} />
                </>
              )}
            </div>

            <div className="px-2 sm:px-4 py-2 sm:py-4 border-t border-border bg-card flex items-end gap-2 sm:gap-3">
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
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm resize-none max-h-40 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => void send()}
                disabled={!canSend}
                className={`px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  canSend 
                    ? "bg-blue-600 dark:bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-700 active:scale-95" 
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                }`}
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
