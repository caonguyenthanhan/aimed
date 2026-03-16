"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { Send, Bot, User, Plus, RefreshCcw, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const GREETINGS: string[] = [
  "Ở đây rồi, cứ nói những gì bạn muốn. Tôi nghe.",
  "Không cần phải ổn đâu. Nói ra nếu bạn thấy cần.",
  "Nếu bạn chỉ muốn than thở một chút, tôi vẫn ở đây.",
  "Hôm nay thế nào cũng được, miễn là bạn không phải chịu một mình.",
  "Muốn nói chuyện, hay chỉ cần có người nghe?"
]

const FRIEND_STYLE_KEY = "mcs_friend_style_v1"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export function FriendChatInterface({ initialConversationId }: { initialConversationId?: string }) {
  const [greeting, setGreeting] = useState(GREETINGS[0])
  useEffect(() => {
    const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
    setGreeting(randomGreeting)
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === "1" && !prev[0].isUser) {
        return [{ ...prev[0], content: randomGreeting }]
      }
      return prev
    })
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
  const [headerPad, setHeaderPad] = useState<string>('6rem')
  useEffect(() => {
    const updatePad = () => {
      try {
        const el = typeof window !== "undefined" ? document.querySelector("[data-site-header]") as HTMLElement | null : null
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
    {
      id: "1",
      content: greeting,
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<{ id: string; title: string; last_active: string }[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState<string>("Tâm sự")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash")
  const [friendStyle, setFriendStyle] = useState<"standard" | "deep">("deep")
  const [voiceMode, setVoiceMode] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>([6, 10, 16, 10, 6])
  const vizIntervalRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const suggestedQuestions = [
    "Hôm nay bạn thấy thế nào?",
    "Điều gì đang khiến bạn bận tâm?",
    "Bạn cần ai đó lắng nghe không?",
    "Bạn mong muốn thay đổi điều gì sớm nhất?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      setAuthToken(t && String(t).trim() ? String(t) : null)
    } catch {
      setAuthToken(null)
    }
  }, [])

  useEffect(() => {
    if (!authToken && initialConversationId) {
      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(`friend_conv_messages_${initialConversationId}`)
          if (raw) {
            const arr = JSON.parse(raw)
            const mapped: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
            if (mapped.length) {
              setMessages(mapped)
              setConversationId(initialConversationId)
              try {
                const t = localStorage.getItem(`friend_conv_title_${initialConversationId}`) || ""
                setCurrentTitle(t || "Tâm sự")
              } catch {}
            }
          }
        }
      } catch {}
    }
  }, [authToken, initialConversationId])

  useEffect(() => {
    if (!authToken && conversationId) {
      try {
        if (typeof window !== "undefined") {
          const serial = messages.map(m => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          localStorage.setItem(`friend_conv_messages_${conversationId}`, JSON.stringify(serial))
          const titleKey = `friend_conv_title_${conversationId}`
          const existingTitle = localStorage.getItem(titleKey) || ""
          if (!existingTitle) {
            const lastUser = [...messages].reverse().find(m => m.isUser && m.content && m.content.trim())
            if (lastUser) {
              const first6 = lastUser.content.trim().split(/\s+/).slice(0, 6).join(" ")
              const t = first6 || "Tâm sự"
              localStorage.setItem(titleKey, t)
              setCurrentTitle(t)
            }
          }
          loadLocalFriendConversations()
        }
      } catch {}
    }
  }, [authToken, conversationId, messages])

  const loadLocalFriendConversations = () => {
    try {
      const items: { id: string; title: string; last_active: string }[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || ""
        if (key.startsWith("friend_conv_messages_")) {
          const id = key.slice("friend_conv_messages_".length)
          let title = localStorage.getItem(`friend_conv_title_${id}`) || ""
          let lastActive = new Date().toISOString()
          const raw = localStorage.getItem(`friend_conv_messages_${id}`)
          if (raw) {
            try {
              const arr = JSON.parse(raw)
              if (Array.isArray(arr) && arr.length) {
                const last = arr[arr.length - 1]
                lastActive = String(last?.timestamp || lastActive)
                if (!title) title = "Tâm sự"
              }
            } catch {}
          }
          items.push({ id, title, last_active: lastActive })
        }
      }
      items.sort((a, b) => (a.last_active > b.last_active ? -1 : 1))
      setConversations(items)
    } catch {}
  }

  useEffect(() => {
    if (!authToken) {
      loadLocalFriendConversations()
    }
  }, [authToken])

  const beginNewConversation = async () => {
    const newId = `friend-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
    setConversationId(newId)
    setMessages([
      {
        id: "1",
        content: greeting,
        isUser: false,
        timestamp: new Date(),
      },
    ])
    if (typeof window !== "undefined") {
      const serial = [
        { id: "1", content: greeting, isUser: false, timestamp: new Date().toISOString() }
      ]
      localStorage.setItem(`friend_conv_messages_${newId}`, JSON.stringify(serial))
      localStorage.setItem(`friend_conv_title_${newId}`, "Tâm sự")
      try {
        const url = new URL(window.location.href)
        url.pathname = "/tam-su"
        url.searchParams.set("id", newId)
        window.history.replaceState(null, "", url.toString())
      } catch {}
    }
    setCurrentTitle("Tâm sự")
    loadLocalFriendConversations()
  }

  const startConversationIfNeeded = async (): Promise<string | null> => {
    if (conversationId) return conversationId
    if (!authToken) {
      try {
        const newId = `friend-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
        setConversationId(newId)
        if (typeof window !== "undefined") {
          const serial = messages.map(m => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          localStorage.setItem(`friend_conv_messages_${newId}`, JSON.stringify(serial))
          localStorage.setItem(`friend_conv_title_${newId}`, "Tâm sự")
          try {
            const url = new URL(window.location.href)
            url.pathname = "/tam-su"
            url.searchParams.set("id", newId)
            window.history.replaceState(null, "", url.toString())
          } catch {}
        }
        loadLocalFriendConversations()
        setCurrentTitle("Tâm sự")
        return newId
      } catch {
        return null
      }
    }
    return conversationId
  }

  const openFriendConversation = async (id: string) => {
    setConversationId(id)
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`friend_conv_messages_${id}`)
        if (raw) {
          const arr = JSON.parse(raw)
          const mapped: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
          if (mapped.length) {
            setMessages(mapped)
            try {
              const t = localStorage.getItem(`friend_conv_title_${id}`) || ""
              setCurrentTitle(t || "Tâm sự")
              const url = new URL(window.location.href)
              url.pathname = "/tam-su"
              url.searchParams.set("id", id)
              window.history.replaceState(null, "", url.toString())
            } catch {}
          }
        }
      }
    } catch {}
  }

  const startRenameConversation = (id: string) => {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(`friend_conv_title_${id}`) || "Tâm sự"
      setRenamingId(id)
      setRenameValue(current)
    }
  }

  const applyRenameConversation = () => {
    if (!renamingId) return
    if (typeof window !== "undefined") {
      localStorage.setItem(`friend_conv_title_${renamingId}`, renameValue.trim() || "Tâm sự")
      if (conversationId === renamingId) {
        setCurrentTitle(renameValue.trim() || "Tâm sự")
      }
      loadLocalFriendConversations()
    }
    setRenamingId(null)
    setRenameValue("")
  }

  const cancelRenameConversation = () => {
    setRenamingId(null)
    setRenameValue("")
  }

  const deleteFriendConversation = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`friend_conv_messages_${id}`)
      localStorage.removeItem(`friend_conv_title_${id}`)
    }
    if (conversationId === id) {
      setConversationId(null)
      setMessages([
        {
          id: "1",
          content: greeting,
          isUser: false,
          timestamp: new Date(),
        },
      ])
      setCurrentTitle("Tâm sự")
    }
    loadLocalFriendConversations()
  }

  const sendMessageToAI = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    try {
      const ensuredId = await startConversationIfNeeded()
      const conversationHistory = [...messages, userMessage].map(m => ({
        role: m.isUser ? "user" : "assistant",
        content: m.content,
      }))
      let provider: string = 'server'
      try {
        const p = typeof window !== 'undefined' ? localStorage.getItem('llm_provider') : null
        if (p === 'gemini' || p === 'server') provider = p
      } catch {}
      const payload = {
        model: selectedModel,
        message: messageText,
        conversation_id: ensuredId || conversationId,
        user_id: null,
        conversationHistory,
        messages: conversationHistory,
        provider,
        temperature: friendStyle === "deep" ? 0.9 : 0.75,
        max_tokens: friendStyle === "deep" ? 1200 : 800,
      }
      const url = "/api/tam-su-chat"
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText} ${errorText}`)
      }
      const data = await response.json()
      const aiResponse = (data as any)?.choices ? ((data as any).choices[0]?.message?.content || "") : ((data as any)?.response || "")
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse || "Mình đang gặp sự cố, bạn thử lại sau nhé.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      const md = (data as any)?.metadata
      if (md && typeof window !== "undefined") {
        try {
          const detail: any = { target: md.mode === "gpu" ? "gpu" : "cpu" }
          if (md.provider) detail.provider = md.provider
          window.dispatchEvent(new CustomEvent("runtime_mode_changed", { detail }))
        } catch {}
      }
      if (!md && typeof (data as any)?.mode !== "undefined" && typeof window !== "undefined") {
        try {
          const detail = { target: ((data as any).mode === "gpu" || (data as any).mode_used === "gpu") ? "gpu" : "cpu" }
          window.dispatchEvent(new CustomEvent("runtime_mode_changed", { detail }))
        } catch {}
      }
      let newId = typeof (data as any).conversation_id === "string" && (data as any).conversation_id ? (data as any).conversation_id : (ensuredId || conversationId)
      if (newId && typeof window !== "undefined") {
        setConversationId(newId)
        
        // Explicitly save messages to localStorage (Standardization with ChatInterface)
        if (!authToken) {
          try {
            const snapshot = [...messages, userMessage, aiMessage]
            const toStore = snapshot.map(m => ({ id: m.id, content: m.content, isUser: m.isUser, timestamp: m.timestamp.toISOString() }))
            localStorage.setItem(`friend_conv_messages_${newId}`, JSON.stringify(toStore))
          } catch {}
        }

        try {
          // Standard naming logic
          const baseText = messageText.trim() || aiResponse.trim()
          const words = baseText.split(/\s+/).slice(0, 6).join(" ")
          const title = words || "Tâm sự"
          localStorage.setItem(`friend_conv_title_${newId}`, title)
          setCurrentTitle(title)
          
          const url = new URL(window.location.href)
          url.pathname = "/tam-su"
          url.searchParams.set("id", newId)
          window.history.replaceState(null, "", url.toString())
        } catch {}
        
        loadLocalFriendConversations()
      }
    } catch (error) {
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Mình đang gặp chút trục trặc, bạn thử lại sau nhé.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    const currentInput = input
    setInput("")
    setIsLoading(true)
    try {
      await sendMessageToAI(currentInput)
    } catch {
    } finally {
      setIsLoading(false)
    }
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
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          const formData = new FormData()
          formData.append("file", blob, "voice.webm")
          const sttUrl = "/api/backend/v1/stt/stream"
          const resp = await fetch(sttUrl, { method: "POST", body: formData })
          let transcript = ""
          if (resp.body) {
            const reader = resp.body.getReader()
            const decoder = new TextDecoder()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = decoder.decode(value)
              const lines = chunk.split(/\n+/).filter(Boolean)
              for (const line of lines) {
                try {
                  const obj = JSON.parse(line)
                  if (obj?.text) transcript += obj.text
                } catch {}
              }
            }
          }
          const finalText = transcript.trim()
          if (finalText) {
            await sendMessageToAI(finalText)
            const reqBody = { text: finalText, lang: "vi" }
            const ttsUrl = "/api/backend/v1/tts/stream"
            const ttsResp = await fetch(ttsUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
            if (ttsResp.ok) {
              const allText = await ttsResp.text()
              const lines = allText.split(/\n+/).filter(Boolean)
              const chunks: Uint8Array[] = []
              let total = 0
              for (const ln of lines) {
                try {
                  const obj = JSON.parse(ln)
                  if (obj && obj.audio_base64) {
                    const b64 = obj.audio_base64
                    const binStr = atob(b64)
                    const bytes = new Uint8Array(binStr.length)
                    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
                    chunks.push(bytes)
                    total += bytes.length
                  }
                } catch {}
              }
              if (chunks.length) {
                const merged = new Uint8Array(total)
                let offset = 0
                for (const part of chunks) {
                  merged.set(part, offset)
                  offset += part.length
                }
                const mp3Blob = new Blob([merged], { type: "audio/mpeg" })
                const url = URL.createObjectURL(mp3Blob)
                setLastAudioUrl(url)
                const audio = new Audio(url)
                try { await audio.play() } catch {}
              } else {
                const resp2 = await fetch("/api/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: finalText, lang: "vi" }) })
                if (resp2.ok) {
                  const j = await resp2.json()
                  const au = j?.audio_url || j?.download_url || null
                  if (au) {
                    setLastAudioUrl(au)
                    const audio = new Audio(au)
                    try { await audio.play() } catch {}
                  }
                }
              }
            } else {
              const resp2 = await fetch("/api/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: finalText, lang: "vi" }) })
              if (resp2.ok) {
                const j = await resp2.json()
                const au = j?.audio_url || j?.download_url || null
                if (au) {
                  setLastAudioUrl(au)
                  const audio = new Audio(au)
                  try { await audio.play() } catch {}
                }
              }
            }
          }
        } catch {}
      }
      mediaRecorderRef.current = mr
      mr.start()
      setIsRecording(true)
    } catch {}
  }

  const stopRecording = () => {
    if (!isRecording) return
    try {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      if (vizIntervalRef.current) {
        clearInterval(vizIntervalRef.current)
        vizIntervalRef.current = null
      }
      try {
        audioCtxRef.current?.close()
      } catch {}
    } catch {}
  }

  return (
    <div className="flex min-h-screen overflow-hidden hero-gradient" suppressHydrationWarning style={{ paddingTop: headerPad }}>
      <div className="flex h-full w-full">
        {showSidebar && (
          <div className="w-64 glass-panel bg-gray-50/50 p-0 flex-shrink-0 h-full flex flex-col rounded-r-2xl backdrop-blur-md">
            <div className="basis-[10%] flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-gray-700">{currentTitle || "Tâm sự"}</span>
              <div className="flex items-center space-x-2">
                <button onClick={beginNewConversation} className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow hover:bg-blue-600">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={loadLocalFriendConversations} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                  <RefreshCcw className="h-4 w-4 text-gray-700" />
                </button>
                <button onClick={() => setShowSidebar(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
            <div className="basis-[90%] space-y-1 overflow-y-auto px-3 pb-3">
              {isLoadingConversations ? (
                <div className="text-xs text-gray-500">Đang tải...</div>
              ) : (
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-xs text-gray-500">Chưa có hội thoại</div>
                  ) : (
                    conversations.map((c) => (
                      <div key={c.id} className="w-full px-3 py-2 rounded-xl hover:bg-gray-100">
                        {renamingId === c.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              className="text-sm px-2 py-1 border rounded w-full"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                            />
                            <button
                              className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                applyRenameConversation()
                              }}
                            >
                              Lưu
                            </button>
                            <button
                              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelRenameConversation()
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <button
                              className="text-left flex-1"
                              onClick={() => openFriendConversation(c.id)}
                            >
                              <div className="text-sm font-medium">{c.title || "Tâm sự"}</div>
                              <div suppressHydrationWarning className="text-[11px] text-gray-500">{new Date(c.last_active).toLocaleString("vi-VN")}</div>
                            </button>
                            <div className="flex items-center space-x-2 ml-2">
                              <button
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startRenameConversation(c.id)
                                }}
                              >
                                Đổi tên
                              </button>
                              <button
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteFriendConversation(c.id)
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="basis-[85%] overflow-y-auto px-4 pt-8 pb-40">
            <div className="max-w-3xl mx-auto">
              
              <div className="space-y-2">
                {messages.length <= 1 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shadow">
                      <Bot className="h-10 w-10 text-blue-500" />
                    </div>
                    <div className="mt-4 text-gray-700">
                      <div className="text-lg font-semibold">Xin chào bạn</div>
                      <div className="text-sm">Hãy chia sẻ điều bạn đang nghĩ. Mình luôn lắng nghe.</div>
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start space-x-2 ${message.isUser ? "justify-end" : "justify-start"}`}>
                    {!message.isUser && (
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3 py-2 shadow-[0px_2px_6px_rgba(0,0,0,0.05)] ${message.isUser ? "bg-blue-500 text-white rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[12px] rounded-br-[4px]" : "bg-gray-100 dark:bg-gray-800 rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[4px]"}`}>
                      {message.isUser ? (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm dark:prose-invert leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className={`text-[11px] mt-1 ${message.isUser ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                        <span suppressHydrationWarning>
                          {message.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {message.isUser && (
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 glass-panel border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-3xl mx-auto px-2">
              <div className="mb-2 flex flex-wrap gap-2 items-center">
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as any)} className="text-xs px-2 py-1 border rounded">
                  <option value="flash">flash</option>
                  <option value="pro">pro</option>
                </select>
                <select value={friendStyle} onChange={(e) => setFriendStyle(e.target.value as any)} className="text-xs px-2 py-1 border rounded">
                  <option value="standard">gọn</option>
                  <option value="deep">sâu</option>
                </select>
                <button onClick={() => setVoiceMode(v => !v)} className={`text-xs px-2 py-1 rounded ${voiceMode ? "bg-green-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
                  {voiceMode ? "Voice" : "Chat"}
                </button>
                {voiceMode && (
                  <>
                    {!isRecording ? (
                      <button onClick={startRecording} className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Ghi âm</button>
                    ) : (
                      <button onClick={stopRecording} className="text-xs px-2 py-1 bg-red-500 text-white rounded">Dừng</button>
                    )}
                    {lastAudioUrl && (
                      <a href={lastAudioUrl} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Nghe lại</a>
                    )}
                    {isRecording && (
                      <div className="flex items-end gap-1 h-6">
                        <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[0] || 6))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                        <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[1] || 10))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                        <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[2] || 16))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                        <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[3] || 10))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                        <div style={{ height: `${Math.max(4, Math.min(24, (levels?.[4] || 6))) }px` }} className="w-1 bg-green-500 rounded-sm transition-all duration-50"></div>
                      </div>
                    )}
                  </>
                )}
                {suggestedQuestions.slice(0, 4).map((q) => (
                  <button key={q} onClick={() => setInput(q)} className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200">
                    {q}
                  </button>
                ))}
              </div>
              <div className="rounded-[24px] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.1)] px-4 py-2 flex items-center gap-2 hover:scale-[1.02] transition-transform">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Bạn đang nghĩ gì, nói với mình nhé..."
                  className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent resize-none py-2 max-h-32 overflow-y-auto"
                  rows={1}
                  style={{ minHeight: '40px' }}
                  disabled={isLoading}
                />
                <button
                  onClick={voiceMode ? (isRecording ? stopRecording : startRecording) : handleSubmit}
                  disabled={(!input.trim() && !voiceMode) || isLoading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm active:scale-95"
                >
                  {voiceMode ? (isRecording ? "Dừng" : "Ghi âm") : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
