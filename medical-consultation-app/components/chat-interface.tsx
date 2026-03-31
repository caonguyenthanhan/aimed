"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Bot, User, Sparkles, Volume2, Pause, Play, Square, X, Plus, RefreshCcw, ChevronLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { } from "@/lib/llm-config"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { sanitizeTtsText } from "@/lib/tts-text"
import { UnifiedComposer } from "@/components/unified-composer"
import { LlmChatResponseSchema } from "@/lib/llm-schema"
import type { LlmMessage } from "@/types/llm"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { loadLocalDoctorPrivate } from "@/lib/doctor-profile-store"
import { AgentResponseSchema, isAllowedPath, normalizeActions, type AgentAction } from "@/lib/agent-actions"
import { GoogleGenAI, Modality } from "@google/genai"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export function ChatInterface({ initialConversationId }: { initialConversationId?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const initRef = useRef<{ fetched: boolean; opened: boolean; navigating: boolean }>({ fetched: false, opened: false, navigating: false })
  const [headerPad, setHeaderPad] = useState<string>('6rem')
  const [agentMode, setAgentMode] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authSecret, setAuthSecret] = useState("")
  const [liveMode, setLiveMode] = useState(false)
  const [textLiveMode, setTextLiveMode] = useState(false)
  const liveSessionRef = useRef<any>(null)
  const liveAudioContextRef = useRef<AudioContext | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const liveSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  useEffect(() => {
    const updatePad = () => {
      try {
        const el = typeof window !== 'undefined' ? document.querySelector('[data-site-header]') as HTMLElement | null : null
        const bottom = el ? el.getBoundingClientRect().bottom : 64
        const extra = 16
        setHeaderPad(`${Math.round(bottom + extra)}px`)
      } catch {}
    }
    updatePad()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updatePad)
      window.addEventListener('scroll', updatePad, { passive: true } as any)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updatePad)
        window.removeEventListener('scroll', updatePad)
      }
    }
  }, [])

  useEffect(() => {
    try {
      const v = localStorage.getItem("mcs_agent_mode_v1")
      setAgentMode(v === "1")
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const v = localStorage.getItem("mcs_text_live_mode_v1")
      setTextLiveMode(v === "1")
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("mcs_text_live_mode_v1", textLiveMode ? "1" : "0")
    } catch {}
  }, [textLiveMode])

  const toggleAgentMode = () => {
    setAgentMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem("mcs_agent_mode_v1", next ? "1" : "0")
      } catch {}
      return next
    })
  }

  useEffect(() => {
    toast({ title: "Agent mode", description: agentMode ? "Đã bật" : "Đã tắt" })
  }, [agentMode, toast])

  const toggleTextLiveMode = () => {
    setTextLiveMode((prev) => {
      const next = !prev
      return next
    })
  }

  useEffect(() => {
    toast({ title: "Live text", description: textLiveMode ? "Đã bật" : "Đã tắt" })
  }, [textLiveMode, toast])

  const requireAuthIfNeeded = (meta?: any) => {
    try {
      if (!meta || meta.provider !== "gemini") return
      const access = String(meta.access || "").trim()
      if (access === "system_key") {
        const used = Number(localStorage.getItem("mcs_system_gemini_used_v1") || "0")
        localStorage.setItem("mcs_system_gemini_used_v1", String(Number.isFinite(used) ? used + 1 : 1))
      }
    } catch {}
  }

  const secretKeyOf = (uid?: string | null) => `mcs_gemini_secret_v1:${String(uid || "anon")}`

  useEffect(() => {
    try {
      const uid = typeof window !== "undefined" ? (localStorage.getItem("userId") || "") : ""
      const k = localStorage.getItem(secretKeyOf(uid || "anon")) || ""
      setAuthSecret(String(k || ""))
    } catch {
      setAuthSecret("")
    }
  }, [])

  useEffect(() => {
    try {
      const uid = typeof window !== "undefined" ? (localStorage.getItem("userId") || "") : ""
      const k = localStorage.getItem(secretKeyOf(uid || "anon")) || ""
      setAuthSecret(String(k || ""))
    } catch {
      setAuthSecret("")
    }
  }, [])

  const hasSecret = () => !!String(authSecret || "").trim()

  const canUseSystemGemini = () => {
    try {
      const used = Number(localStorage.getItem("mcs_system_gemini_used_v1") || "0")
      return Number.isFinite(used) ? used < 5 : true
    } catch {
      return true
    }
  }

  const ensureGeminiQuota = () => {
    if (hasSecret()) return true
    if (canUseSystemGemini()) return true
    setAuthOpen(true)
    toast({ title: "Cần API Key", description: "Bạn đã dùng hết 5 lượt miễn phí. Hãy nhập API key hoặc pass." })
    return false
  }

  const saveAuth = () => {
    try {
      const uid = typeof window !== "undefined" ? (localStorage.getItem("userId") || "") : ""
      const key = secretKeyOf(uid || "anon")
      const v = String(authSecret || "").trim()
      if (v) localStorage.setItem(key, v)
      else localStorage.removeItem(key)
    } catch {
    }
    setAuthOpen(false)
  }

  const clearAuth = () => {
    try {
      const uid = typeof window !== "undefined" ? (localStorage.getItem("userId") || "") : ""
      localStorage.removeItem(secretKeyOf(uid || "anon"))
    } catch {}
    setAuthSecret("")
  }

  const stopLiveMode = async () => {
    try {
      if (liveSessionRef.current) {
        try { liveSessionRef.current.close() } catch {}
        liveSessionRef.current = null
      }
      if (liveProcessorRef.current) {
        try { liveProcessorRef.current.disconnect() } catch {}
        liveProcessorRef.current = null
      }
      if (liveSourceRef.current) {
        try { liveSourceRef.current.disconnect() } catch {}
        liveSourceRef.current = null
      }
      if (liveAudioContextRef.current) {
        try { await liveAudioContextRef.current.close() } catch {}
        liveAudioContextRef.current = null
      }
      if (liveStreamRef.current) {
        try { liveStreamRef.current.getTracks().forEach((t) => t.stop()) } catch {}
        liveStreamRef.current = null
      }
    } catch {}
  }

  const startLiveMode = async () => {
    if (!hasSecret()) {
      setAuthOpen(true)
      return
    }
    let apiKey = ""
    try {
      apiKey = String(authSecret || "").trim()
    } catch {}
    const r = await fetch("/api/live/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_pass: apiKey }),
    }).then((x) => x.json()).catch(() => null)
    if (r?.ok && typeof r?.api_key === "string" && String(r.api_key).trim()) {
      apiKey = String(r.api_key).trim()
    }
    if (!apiKey) {
      toast({ title: "Live mode", description: "Không lấy được API key để bật Live mode." })
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
    liveStreamRef.current = stream

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    liveAudioContextRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    liveSourceRef.current = source
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    liveProcessorRef.current = processor
    source.connect(processor)
    processor.connect(ctx.destination)

    const ai = new GoogleGenAI({ apiKey })
    const session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } },
        systemInstruction: "Bạn là trợ lý y tế AI. Trả lời ngắn gọn, an toàn và thân thiện.",
      },
      callbacks: {
        onopen: () => {
          const aiMessage: Message = { id: (Date.now() + 1).toString(), content: "Đã kết nối Live mode. Bạn có thể nói ngay bây giờ.", isUser: false, timestamp: new Date() }
          setMessages((prev) => [...prev, aiMessage])
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0)
            const pcm16 = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]))
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
            }
            const buffer = new ArrayBuffer(pcm16.length * 2)
            const view = new DataView(buffer)
            for (let i = 0; i < pcm16.length; i++) {
              view.setInt16(i * 2, pcm16[i], true)
            }
            let binary = ""
            const bytes = new Uint8Array(buffer)
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
            const base64Data = btoa(binary)
            try {
              session.sendRealtimeInput({ audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" } } as any)
            } catch {}
          }
        },
        onmessage: async (m: any) => {
          const base64Audio = m?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data
          if (base64Audio && liveAudioContextRef.current) {
            try {
              const binaryString = atob(String(base64Audio))
              const len = binaryString.length
              const bytes = new Uint8Array(len)
              for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
              const pcm16 = new Int16Array(bytes.buffer)
              const audioBuffer = liveAudioContextRef.current.createBuffer(1, pcm16.length, 24000)
              const channelData = audioBuffer.getChannelData(0)
              for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768.0
              const src = liveAudioContextRef.current.createBufferSource()
              src.buffer = audioBuffer
              src.connect(liveAudioContextRef.current.destination)
              src.start()
            } catch {}
          }
        },
        onclose: () => {
          setLiveMode(false)
          stopLiveMode()
        },
      },
    } as any)
    liveSessionRef.current = session
    setLiveMode(true)
  }

  const toggleLiveMode = async () => {
    if (liveMode) {
      await stopLiveMode()
      setLiveMode(false)
      const aiMessage: Message = { id: (Date.now() + 1).toString(), content: "Đã tắt Live mode.", isUser: false, timestamp: new Date() }
      setMessages((prev) => [...prev, aiMessage])
      return
    }
    await startLiveMode()
  }

  const executeAgentActions = async (actions: AgentAction[], opts?: { speakMessageId?: string; fallbackSpeakText?: string }) => {
    for (const a of actions) {
      if (a.type === "speak") {
        const mid = String(opts?.speakMessageId || "").trim()
        const t = String((a as any)?.args?.text || "").trim() || String(opts?.fallbackSpeakText || "").trim()
        if (mid && t) {
          await handleTextToSpeech(mid, t)
          return
        }
        continue
      }
    }
  }
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null)
  const [isPausedAudio, setIsPausedAudio] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [sosHotlines, setSosHotlines] = useState<Array<{ label: string; number: string }>>([])
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sendingRef = useRef<boolean>(false)
  const messagesRef = useRef<Message[]>([])
  const userBufferRef = useRef<string[]>([])
  const userBufferTimerRef = useRef<any>(null)
  const inFlightRef = useRef<boolean>(false)
  const pendingFlushRef = useRef<boolean>(false)
  const assistantQueueRef = useRef<Array<{ id: string; content: string; delay_ms?: number }>>([])
  const assistantWorkerRef = useRef<boolean>(false)
  const liveTextRunRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)

  // Smart suggestion system based on context and conversation history
  const getSmartSuggestions = () => {
    // Base suggestions for new conversations
    const baseSuggestions = [
      "Tôi bị đau đầu, có phải cảm cúm không?",
      "Liệu pháp nào giúp giảm lo âu?",
      "Thông tin về thuốc Paracetamol?",
      "Cách phòng ngừa cảm cúm?",
    ]

    // Advanced suggestions based on conversation context
    const contextualSuggestions = {
      pain: [
        "Đau đầu kéo dài bao lâu thì cần đi khám?",
        "Cách giảm đau tự nhiên không dùng thuốc?",
        "Phân biệt đau đầu thường và đau đầu nguy hiểm?",
        "Thuốc giảm đau nào an toàn nhất?"
      ],
      mental: [
        "Làm thế nào để biết mình có trầm cảm?",
        "Kỹ thuật thở giúp giảm căng thẳng?",
        "Khi nào cần gặp bác sĩ tâm lý?",
        "Cách cải thiện giấc ngủ tự nhiên?"
      ],
      medication: [
        "Cách uống thuốc đúng cách?",
        "Tác dụng phụ của thuốc kháng sinh?",
        "Thuốc có thể uống cùng thức ăn không?",
        "Quên uống thuốc thì phải làm sao?"
      ],
      prevention: [
        "Chế độ ăn tăng cường miễn dịch?",
        "Tập thể dục như thế nào để khỏe mạnh?",
        "Cách phòng ngừa bệnh tim mạch?",
        "Kiểm tra sức khỏe định kỳ gồm gì?"
      ]
    }

    // Analyze recent messages for context
    if (messages.length > 1) {
      const recentMessages = messages.slice(-3).map(m => m.content.toLowerCase())
      const conversationText = recentMessages.join(' ')

      // Detect conversation themes
      if (conversationText.includes('đau') || conversationText.includes('nhức')) {
        return contextualSuggestions.pain
      }
      if (conversationText.includes('lo ����u') || conversationText.includes('stress') || 
          conversationText.includes('trầm cảm') || conversationText.includes('tâm lý')) {
        return contextualSuggestions.mental
      }
      if (conversationText.includes('thuốc') || conversationText.includes('uống') || 
          conversationText.includes('liều')) {
        return contextualSuggestions.medication
      }
      if (conversationText.includes('phòng ngừa') || conversationText.includes('tránh') || 
          conversationText.includes('ngăn ngừa')) {
        return contextualSuggestions.prevention
      }
    }

    return baseSuggestions
  }

  const suggestedQuestions = getSmartSuggestions()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    messagesRef.current = messages
  }, [messages])

  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash')
  const [showTools, setShowTools] = useState(false)
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isDisclaimerCollapsed, setIsDisclaimerCollapsed] = useState<boolean>(false)
  const [disclaimerDismissed, setDisclaimerDismissed] = useState<boolean>(false)
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState<boolean>(false)
  const [sidebarSearch, setSidebarSearch] = useState<string>('')
 

  const startConversationIfNeeded = async (): Promise<string | null> => {
    if (conversationId) return conversationId
    if (!authToken) {
      try {
        const newId = `conv-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
        setConversationId(newId)
        if (typeof window !== 'undefined') {
          const serial = messages.map(m => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          localStorage.setItem(`conv_messages_${newId}`, JSON.stringify(serial))
          localStorage.setItem(`conv_title_${newId}`, 'Hội thoại')
        }
        loadLocalConversations()
        return newId
      } catch {
        return null
      }
    }
    try {
      const resp = await fetch('/api/backend/v1/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ title: '' })
      })
      const data = await resp.json()
      if (resp.ok && data?.id) {
        setConversationId(data.id)
        await fetchConversations()
        
        return data.id
      }
    } catch (e) {
      console.error('Start conversation error:', e)
    }
    return conversationId
  }

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const enqueueAssistantDelivery = (items: Array<{ content: string; delay_ms?: number }>) => {
    const safeItems = items
      .map((m, idx) => {
        const content = String(m?.content || "").trim()
        const id = (Date.now() + Math.random()).toString()
        if (!content) {
          console.warn(`[v0] Item ${idx} has empty content after trim, preserving with placeholder to prevent loss`)
        }
        return { id, content: content || " ", delay_ms: typeof m?.delay_ms === "number" ? m.delay_ms : undefined }
      })
    if (!safeItems.length) return
    assistantQueueRef.current.push(...safeItems)
    if (!assistantWorkerRef.current) {
      assistantWorkerRef.current = true
      void (async () => {
        try {
          while (assistantQueueRef.current.length) {
            const next = assistantQueueRef.current.shift()
            if (!next) continue
            const delay = Math.max(0, Math.min(30000, Number(next.delay_ms ?? 0)))
            if (delay) await sleep(delay)
            const aiMsg: Message = { id: next.id, content: next.content, isUser: false, timestamp: new Date() }
            setMessages((prev) => {
              const updated = [...prev, aiMsg]
              try {
                const idToUse = conversationId
                if (idToUse && typeof window !== "undefined") {
                  const serial = updated.map((m) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
                  sessionStorage.setItem(`pending_conv_messages_${idToUse}`, JSON.stringify(serial))
                  if (!authToken) localStorage.setItem(`conv_messages_${idToUse}`, JSON.stringify(serial))
                }
              } catch {}
              return updated
            })
          }
        } finally {
          assistantWorkerRef.current = false
        }
      })()
    }
    return safeItems.map((x) => x.id)
  }

  const waitAssistantIdle = async () => {
    while (assistantWorkerRef.current || assistantQueueRef.current.length) {
      await sleep(40)
    }
  }

  const deliverLiveText = async (text: string) => {
    const full = String(text || "")
    if (!full.trim()) return null
    await waitAssistantIdle()
    const runId = ++liveTextRunRef.current
    const id = (Date.now() + Math.random()).toString()
    setMessages((prev) => [...prev, { id, content: "", isUser: false, timestamp: new Date() }])
    const step = 14
    for (let i = step; i < full.length + step; i += step) {
      if (liveTextRunRef.current !== runId) return null
      const partial = full.slice(0, Math.min(i, full.length))
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: partial } : m)))
      await sleep(35)
    }
    return id
  }

  const flushUserBuffer = async () => {
    if (inFlightRef.current) {
      pendingFlushRef.current = true
      return
    }
    const text = userBufferRef.current.map((s) => String(s || "").trim()).filter(Boolean).join("\n").trim()
    if (!text) return
    userBufferRef.current = []

    inFlightRef.current = true
    setIsLoading(true)
    try {
      const ensuredId = await startConversationIfNeeded()
      const historySnapshot = (messagesRef.current || []).map((m) => ({ role: m.isUser ? "user" : "assistant", content: m.content })) as LlmMessage[]
      let provider: string = "server"
      try {
        const p = typeof window !== "undefined" ? localStorage.getItem("llm_provider") : null
        if (p === "gemini" || p === "server") provider = p
      } catch {}
      const needsGeminiGate = agentMode || provider === "gemini"
      if (needsGeminiGate && !ensureGeminiQuota()) return

      const access_pass = String(authSecret || "").trim() || undefined
      const delivery_mode = textLiveMode ? "live" : "chunked"
      const payload = {
        model: selectedModel,
        message: text,
        conversation_id: ensuredId || conversationId,
        user_id: userId,
        conversationHistory: historySnapshot,
        messages: historySnapshot,
        provider,
        access_pass,
        delivery_mode,
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

      const response = await fetch(agentMode ? "/api/agent-chat" : "/api/llm-chat", {
        method: "POST",
        headers: authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } : { "Content-Type": "application/json" },
        body: JSON.stringify(agentMode ? { message: text, messages: historySnapshot, conversation_id: ensuredId || conversationId, tier: selectedModel, category: "consultation", access_pass, delivery_mode } : payload),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText} ${errorText}`)
      }

      const raw = await response.json()
      const data = agentMode
        ? (AgentResponseSchema.safeParse(raw).success ? AgentResponseSchema.parse(raw) : raw)
        : (LlmChatResponseSchema.safeParse(raw).success ? LlmChatResponseSchema.parse(raw) : raw)

      const md = (data as any)?.metadata
      requireAuthIfNeeded(md)
      if (md && (md as any)?.sos) {
        try {
          const hs = Array.isArray((md as any)?.hotlines) ? (md as any).hotlines : []
          setSosHotlines(hs.map((h: any) => ({ label: String(h?.label || ""), number: String(h?.number || "") })).filter((h: any) => h.label && h.number))
        } catch {
          setSosHotlines([])
        }
        setSosOpen(true)
      }

      const aiResponse = String((data as any)?.response || (data as any)?.choices?.[0]?.message?.content || "").trim()
      const planned = Array.isArray((data as any)?.messages) ? (data as any).messages : null
      const deliverList = (planned && planned.length)
        ? planned.map((m: any) => ({ content: String(m?.content || ""), delay_ms: typeof m?.delay_ms === "number" ? m.delay_ms : undefined }))
        : [{ content: aiResponse || "Không nhận được phản hồi từ máy trả lời", delay_ms: 0 }]
      let deliveredIds: string[] = []
      if (delivery_mode === "live") {
        const lastId = await deliverLiveText(aiResponse || deliverList.map((x) => x.content).join("\n\n"))
        if (lastId) deliveredIds = [lastId]
      } else {
        deliveredIds = enqueueAssistantDelivery(deliverList) || []
      }

      let newId = typeof (data as any).conversation_id === "string" && (data as any).conversation_id ? (data as any).conversation_id : (ensuredId || conversationId)
      if (newId && typeof window !== "undefined") {
        setConversationId(newId)
        try {
          const url = new URL(window.location.href)
          url.pathname = "/tu-van"
          url.searchParams.set("id", newId)
          window.history.replaceState(null, "", url.toString())
        } catch {
          router.replace(`/tu-van?id=${newId}`)
        }
      }

      await fetchConversations()

      const agentActions = agentMode ? normalizeActions((data as any)?.actions) : []
      if (agentActions.length) {
        const lastId = deliveredIds[deliveredIds.length - 1] || (Date.now() + 1).toString()
        let executionDelay = 1000
        if (delivery_mode !== "live") {
          const allDelays = deliverList.map((m: any) => (m?.delay_ms || 0))
          const totalDelay = allDelays.reduce((a, b) => a + b, 0)
          executionDelay = Math.max(totalDelay + 500, 1500)
        }
        setTimeout(async () => {
          await executeAgentActions(agentActions, { speakMessageId: lastId, fallbackSpeakText: aiResponse })
        }, executionDelay)
      }
    } catch {
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      inFlightRef.current = false
      setIsLoading(false)
      if (pendingFlushRef.current) {
        pendingFlushRef.current = false
        void flushUserBuffer()
      }
    }
  }

  const bufferUserMessage = (messageText: string) => {
    const text = String(messageText || "").trim()
    if (!text) return
    if (liveMode) {
      toast({ title: "Live mode", description: "Hãy tắt Live mode để gửi tin nhắn văn bản." })
      return
    }
    void startConversationIfNeeded()
    const userMessage: Message = { id: Date.now().toString(), content: text, isUser: true, timestamp: new Date() }
    setMessages((prev) => {
      const updated = [...prev, userMessage]
      try {
        const idToUse = conversationId
        if (idToUse && typeof window !== "undefined") {
          const serial = updated.map((m) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          sessionStorage.setItem(`pending_conv_messages_${idToUse}`, JSON.stringify(serial))
          if (!authToken) localStorage.setItem(`conv_messages_${idToUse}`, JSON.stringify(serial))
        }
      } catch {}
      return updated
    })
    userBufferRef.current.push(text)
    if (userBufferTimerRef.current) clearTimeout(userBufferTimerRef.current)
    userBufferTimerRef.current = setTimeout(() => {
      void flushUserBuffer()
    }, 5000)
  }

  const handleSubmit = async () => {
    if ((!input.trim()) && !selectedImageBase64 && !selectedDocContent) return

    const currentInput = input
    setInput("")

    try {
      // Nếu có ảnh đã chọn, gửi tới VLM cùng với văn bản
      if (selectedImageBase64) {
        const parts: string[] = []
        if (currentInput.trim()) parts.push(`Nội dung: ${currentInput}`)
        if (selectedImageName) parts.push(`Đã đính kèm ảnh: ${selectedImageName}`)
        const userMessage: Message = {
          id: Date.now().toString(),
          content: parts.join('\n'),
          isUser: true,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMessage])

        const resp = await fetch('/api/backend/v1/vision-chat', {
          method: 'POST',
          headers: authToken ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` } : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentInput, image_base64: selectedImageBase64 })
        })

        const data = await resp.json()
        const aiText = data?.response || 'Không nhận được phản hồi từ VLM.'
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          content: aiText,
          isUser: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])
        await fetchConversations()

        setSelectedImageBase64(null)
        setSelectedImageName(null)
        setSelectedImageMime(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else if (selectedDocContent) {
        // Xử lý tài liệu (PDF/DOC)
        const parts: string[] = []
        if (currentInput.trim()) parts.push(`Nội dung: ${currentInput}`)
        if (selectedDocName) parts.push(`Đã đính kèm tài liệu: ${selectedDocName}`)
        
        const userMessage: Message = {
          id: Date.now().toString(),
          content: parts.join('\n'),
          isUser: true,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMessage])

        const resp = await fetch('/api/backend/v1/document-chat', {
          method: 'POST',
          headers: authToken ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` } : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentInput, doc_base64: selectedDocContent, doc_name: selectedDocName })
        })

        const data = await resp.json()
        const aiText = data?.response || 'Không nhận được phản hồi từ hệ thống.'
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          content: aiText,
          isUser: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])
        await fetchConversations()

        setSelectedDocContent(null)
        setSelectedDocName(null)
        if (docInputRef.current) docInputRef.current.value = ''
      } else {
        bufferUserMessage(currentInput)
      }
    } catch (error) {
      console.error("Error getting AI response:", error)
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc tham khảo ý kiến bác sĩ chuyên khoa để có lời khuyên chính xác nhất.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextToSpeech = async (messageId: string, text: string) => {
    try {
      // Nếu đang phát audio khác, dừng lại
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
      }

      setIsPlayingAudio(messageId)

      // Ưu tiên phát theo luồng để bắt đầu nghe sớm
      const sanitized = sanitizeTtsText(String(text))
      const streamUrl = `/api/text-to-speech-stream?text=${encodeURIComponent(sanitized)}&lang=vi`
      const audio = new Audio(streamUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
        audioRef.current = null
      }

      audio.onerror = async () => {
        // Fallback: dùng API thường nếu luồng gặp lỗi
        try {
          const response = await fetch("/api/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sanitized, lang: "vi" }),
          })
          const data = await response.json()
          if (data.audio_url) {
            const altAudio = new Audio(data.audio_url)
            audioRef.current = altAudio
            altAudio.onended = () => {
              setIsPlayingAudio(null)
              setIsPausedAudio(null)
              audioRef.current = null
            }
            altAudio.onerror = () => {
              setIsPlayingAudio(null)
              setIsPausedAudio(null)
              audioRef.current = null
            }
            await altAudio.play()
          } else {
            setIsPlayingAudio(null)
            setIsPausedAudio(null)
          }
        } catch (e) {
          console.error("Fallback TTS error:", e)
          setIsPlayingAudio(null)
          setIsPausedAudio(null)
        }
      }

      await audio.play()
    } catch (error) {
      console.error("Error playing audio:", error)
      setIsPlayingAudio(null)
      setIsPausedAudio(null)
    }
  }

  const handlePauseAudio = (messageId: string) => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsPlayingAudio(null)
      setIsPausedAudio(messageId)
    }
  }

  const handleResumeAudio = (messageId: string) => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
      setIsPlayingAudio(messageId)
      setIsPausedAudio(null)
    }
  }

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlayingAudio(null)
    setIsPausedAudio(null)
  }

  const startNewConversation = async () => {
    await beginNewConversation()
  }

  const beginNewConversation = async () => {
    if (authToken) {
      try {
        const resp = await fetch('/api/backend/v1/conversations/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ title: '' })
        })
        const data = await resp.json()
        const newId: string | undefined = typeof data?.conversation_id === 'string' && data.conversation_id ? data.conversation_id : (typeof data?.id === 'string' ? data.id : undefined)
        if (newId) {
          setConversationId(newId)
          const defaultMsg: Message = {
            id: Date.now().toString(),
            content:
              "Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?",
            isUser: false,
            timestamp: new Date(),
          }
          setMessages([defaultMsg])
          
          await fetchConversations()
          if (typeof window !== 'undefined') {
            try {
              const url = new URL(window.location.href)
              url.pathname = '/tu-van'
              url.searchParams.set('id', newId)
              window.history.replaceState(null, '', url.toString())
            } catch {
              router.replace(`/tu-van?id=${newId}`)
            }
          }
        }
      } catch (e) {
      }
    } else {
      const newId = `conv-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
      setConversationId(newId)
      setMessages([])
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`conv_messages_${newId}`, JSON.stringify([]))
          localStorage.setItem(`conv_title_${newId}`, 'Hội thoại')
        } catch {}
      }
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href)
          url.pathname = '/tu-van'
          url.searchParams.set('id', newId)
          window.history.replaceState(null, '', url.toString())
        } catch {
          router.replace(`/tu-van?id=${newId}`)
        }
      }
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best supported audio format
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Use the actual recorded MIME type, not force it to wav
        const audioBlob = new Blob(chunks, { type: mimeType });
        await handleSpeechToText(audioBlob);
        
        // Dừng tất cả tracks để tắt microphone
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSpeechToText = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.text) {
        setInput(data.text);
        bufferUserMessage(data.text);
        setInput("");
      } else {
        console.error('Speech-to-text error:', data.error);
        alert('Không thể chuyển đổi giọng nói thành văn bản. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error processing speech-to-text:', error);
      alert('Có lỗi xảy ra khi xử lý âm thanh.');
    }
  };

  // Image upload & VLM
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null)
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null)
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null)
  const [selectedDocContent, setSelectedDocContent] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setSelectedImageBase64(base64)
      setSelectedImageName(file.name)
      setSelectedImageMime(file.type)
    } catch (err) {
      console.error('Error reading image:', err)
      alert('Không thể đọc ảnh. Vui lòng thử lại.')
      setSelectedImageBase64(null)
      setSelectedImageName(null)
      setSelectedImageMime(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setSelectedDocContent(base64)
      setSelectedDocName(file.name)
    } catch (err) {
      console.error('Error reading doc:', err)
      alert('Không thể đọc tài liệu.')
    }
  }
  useEffect(() => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
      setAuthToken(t)
      setUserId(uid || null)
    } catch {}
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined
        const resp = await fetch('/api/backend/v1/runtime/state', { headers })
        if (resp.ok) {
          const data = await resp.json()
          const m = String(data?.model || '').toLowerCase()
          if (m === 'pro' || m === 'flash') setSelectedModel(m as 'flash' | 'pro')
        }
      } catch {}
    })()
  }, [authToken])
  useEffect(() => {
    ;(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`
        await fetch('/api/backend/v1/runtime/state', { method: 'POST', headers, body: JSON.stringify({ model: selectedModel }) })
      } catch {}
    })()
  }, [selectedModel, authToken])
  useEffect(() => {
    try {
      const v = typeof window !== 'undefined' ? localStorage.getItem('dismiss_disclaimer') : null
      setDisclaimerDismissed(!!v)
    } catch {}
  }, [])

  // Drag & Drop image support
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    try {
      const file = e.dataTransfer.files && e.dataTransfer.files[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        alert('Chỉ hỗ trợ kéo-thả ảnh.')
        return
      }
      const base64 = await fileToBase64(file)
      setSelectedImageBase64(base64)
      setSelectedImageName(file.name)
      setSelectedImageMime(file.type)
    } catch (err) {
      console.error('Error handling drop:', err)
      alert('Không thể xử lý ảnh được kéo-thả. Vui lòng thử lại.')
    }
  }

  const handleRemoveImage = () => {
    setSelectedImageBase64(null)
    setSelectedImageName(null)
    setSelectedImageMime(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveDoc = () => {
    setSelectedDocContent(null)
    setSelectedDocName(null)
    if (docInputRef.current) docInputRef.current.value = ''
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const [conversations, setConversations] = useState<{ id: string; title: string; last_active: string }[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth >= 640 : true))
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState<string>("")
  const [serverUnavailable, setServerUnavailable] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)

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

  const loadLocalConversations = () => {
    if (typeof window === 'undefined') return
    try {
      const items: { id: string; title: string; last_active: string }[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || ''
        if (key.startsWith('conv_messages_')) {
          const id = key.slice('conv_messages_'.length)
          let title = localStorage.getItem(`conv_title_${id}`) || ''
          let lastActive = new Date().toISOString()
          const raw = localStorage.getItem(`conv_messages_${id}`)
          if (raw) {
            try {
              const arr = JSON.parse(raw)
              if (Array.isArray(arr) && arr.length) {
                const last = arr[arr.length - 1]
                lastActive = String(last?.timestamp || lastActive)
                if (!title) {
                  title = 'Hội thoại'
                }
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

  const fetchConversations = async () => {
    if (!authToken) {
      loadLocalConversations()
      return
    }
    setIsLoadingConversations(true)
    try {
      const resp = await fetch('/api/backend/v1/conversations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      
      // Check if response is OK and is JSON
      if (!resp.ok) {
        setServerUnavailable(true)
        setIsLoadingConversations(false)
        return
      }
      
      const contentType = resp.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        setServerUnavailable(true)
        setIsLoadingConversations(false)
        return
      }
      
      const data = await resp.json()
      const serverItems = Array.isArray(data?.conversations) ? data.conversations : []
      const sorted = serverItems.slice().sort((a: any, b: any) => (a.last_active > b.last_active ? -1 : 1))
      setConversations(sorted)
      setServerUnavailable(false)
    } catch (e) {
      // Silently handle error - server is likely unavailable
      setServerUnavailable(true)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const openConversation = async (id: string) => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        url.pathname = '/tu-van'
        url.searchParams.set('id', id)
        window.history.replaceState(null, '', url.toString())
      } catch {
        router.replace(`/tu-van?id=${id}`)
      }
    }
    setConversationId(id)
    if (!authToken || String(id).startsWith('conv-')) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(`conv_messages_${id}`)
          if (raw) {
            const arr = JSON.parse(raw)
            const mapped: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
            if (mapped.length) {
              setMessages(mapped)
            }
          }
        }
      } catch {}
      return
    }
    try {
      const resp = await fetch(`/api/backend/v1/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      if (!resp.ok) {
        if (resp.status === 404) {
          throw new Error('Không tìm thấy hội thoại hoặc bạn không có quyền truy cập.')
        }
        throw new Error(`Lỗi server: ${resp.status}`)
      }
      const data = await resp.json()
      const src = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data?.items) ? data.items : [])
      const lastTs = typeof data?.last_active === 'string' ? data.last_active : new Date().toISOString()
      let mapped: Message[] = src.map((m: any, idx: number) => ({
        id: String(m?.id || `${id}-${idx}`),
        content: String(m?.content || ''),
        isUser: String(m?.role || 'user') === 'user',
        timestamp: new Date(m?.timestamp || lastTs)
      }))

      

      if (!mapped.length && typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem(`pending_conv_messages_${id}`)
          if (raw) {
            const arr = JSON.parse(raw)
            const snap: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
            if (snap.length) {
              setMessages(snap)
              sessionStorage.removeItem(`pending_conv_messages_${id}`)
            } else {
              setMessages([
                {
                  id: '1',
                  content:
                    'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
                  isUser: false,
                  timestamp: new Date(),
                },
              ])
            }
          } else {
            setMessages([
              {
                id: '1',
                content:
                  'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
                isUser: false,
                timestamp: new Date(),
              },
            ])
          }
        } catch {
          setMessages([
            {
              id: '1',
              content:
                'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
              isUser: false,
              timestamp: new Date(),
            },
          ])
        }
      } else {
        setMessages(mapped)
        try {
          if (typeof window !== 'undefined') {
            const rawPend = sessionStorage.getItem(`pending_conv_messages_${id}`)
            if (rawPend) {
              const arr = JSON.parse(rawPend)
              const pend: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
              if (pend.length) {
                const existing = new Set(mapped.map(m => m.id))
                const merged = [...mapped]
                for (const pm of pend) {
                  if (!existing.has(pm.id)) merged.push(pm)
                }
                merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                setMessages(merged)
              }
              sessionStorage.removeItem(`pending_conv_messages_${id}`)
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error('Open conversation error:', e)
      setServerUnavailable(true)
      setMessages([
        {
          id: 'error-1',
          content: 'Không thể kết n���i đến server để tải lịch sử hội thoại. Vui lòng kiểm tra kết nối và thử lại.',
          isUser: false,
          timestamp: new Date(),
        },
      ])
    }
  }

  useEffect(() => {
    if (!initialConversationId) {
      setMessages([
        {
          id: '1',
          content:
            'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
          isUser: false,
          timestamp: new Date(),
        },
      ])
      setConversationId(null)
    }
  }, [initialConversationId])

  const renameConversation = async (id: string, title: string) => {
    if (!authToken || String(id).startsWith('conv-')) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`conv_title_${id}`, title)
          loadLocalConversations()
        }
      } catch {}
      return
    }
    try {
      const resp = await fetch(`/api/backend/v1/conversations/${id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ title })
      })
      if (resp.ok) {
        await fetchConversations()
      }
    } catch (e) {
      console.error('Rename conversation error:', e)
    }
  }

  const deleteConversation = async (id: string) => {
    if (!authToken || String(id).startsWith('conv-')) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`conv_messages_${id}`)
          localStorage.removeItem(`conv_title_${id}`)
          setConversations((prev) => prev.filter((c) => c.id !== id))
          if (conversationId === id) {
            setConversationId(null)
            setMessages([
              {
                id: '1',
                content:
                  'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. B��n có câu hỏi gì không?',
                isUser: false,
                timestamp: new Date(),
              },
            ])
          }
        }
      } catch {}
      return
    }
    try {
      const resp = await fetch(`/api/backend/v1/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      if (resp.ok || resp.status === 404) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`conv_messages_${id}`)
            localStorage.removeItem(`conv_title_${id}`)
          } catch {}
        }
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (conversationId === id) {
          setConversationId(null)
          setMessages([
            {
              id: '1',
              content:
                'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
              isUser: false,
              timestamp: new Date(),
            },
          ])
        }
      }
    } catch (e) {
      console.error('Delete conversation error:', e)
    }
  }

  useEffect(() => {
    if (authToken && initialConversationId && !initRef.current.opened) {
      initRef.current.opened = true
      openConversation(initialConversationId)
      setTimeout(() => { initRef.current.opened = false }, 500)
    }
  }, [authToken, initialConversationId])

  useEffect(() => {
    if (!authToken && initialConversationId) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(`conv_messages_${initialConversationId}`)
          if (raw) {
            const arr = JSON.parse(raw)
            const mapped: Message[] = Array.isArray(arr) ? arr.map((m: any) => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: new Date(m.timestamp) })) : []
            if (mapped.length) {
              setMessages(mapped)
              setConversationId(initialConversationId)
            }
          }
        }
      } catch {}
    }
  }, [authToken, initialConversationId])

  useEffect(() => {
    if (!authToken) {
      loadLocalConversations()
    }
  }, [authToken])

  useEffect(() => {
    if (authToken && !initRef.current.fetched) {
      initRef.current.fetched = true
      fetchConversations()
      setTimeout(() => { initRef.current.fetched = false }, 500)
    }
  }, [authToken])

  

  useEffect(() => {
    if (!authToken && conversationId) {
      try {
        if (typeof window !== 'undefined') {
          const serial = messages.map(m => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          localStorage.setItem(`conv_messages_${conversationId}`, JSON.stringify(serial))
          const titleKey = `conv_title_${conversationId}`
          const existingTitle = localStorage.getItem(titleKey) || ''
          if (!existingTitle) {
            const lastUser = [...messages].reverse().find(m => m.isUser && m.content && m.content.trim())
            if (lastUser) {
              const first6 = lastUser.content.trim().split(/\s+/).slice(0, 6).join(' ')
              localStorage.setItem(titleKey, first6)
            }
          }
          loadLocalConversations()
        }
      } catch {}
    }
  }, [messages, authToken, conversationId])

  useEffect(() => {
    const handler = () => {
      try {
        if (conversationId && typeof window !== 'undefined') {
          const toStore = messages.map(m => ({ id: String(m.id), content: String(m.content), isUser: !!m.isUser, timestamp: m.timestamp.toISOString() }))
          sessionStorage.setItem(`pending_conv_messages_${conversationId}`, JSON.stringify(toStore))
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handler)
      }
    }
  }, [messages, conversationId])
  return (
    <div className="flex h-screen overflow-hidden hero-gradient dark:hero-gradient-dark" suppressHydrationWarning style={{ paddingTop: headerPad }}>
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
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên hội thoại</DialogTitle>
            <DialogDescription>
              Nhập tiêu đề mới cho hội thoại này
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={renameInput} onChange={(e) => setRenameInput(e.target.value)} placeholder="Nhập tiêu đề" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRenameOpen(false); setRenameTargetId(null) }}>Hủy</Button>
            <Button onClick={async () => { if (renameTargetId && renameInput.trim()) { await renameConversation(renameTargetId, renameInput.trim()); setIsRenameOpen(false); setRenameTargetId(null) } }}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key / Pass</DialogTitle>
            <DialogDescription>
              Bạn được hỏi 5 lượt bằng key hệ thống. Sau đó cần API key của bạn hoặc pass.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="password" value={authSecret} onChange={(e) => setAuthSecret(e.target.value)} placeholder="Nhập API key hoặc pass" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearAuth}>Xoá</Button>
            <Button variant="outline" onClick={() => setAuthOpen(false)}>Đóng</Button>
            <Button onClick={saveAuth}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!isMobile && showSidebar && (
        <div className="w-64 glass-panel dark:glass-panel-dark bg-white dark:bg-slate-900 p-0 flex-shrink-0 h-full flex flex-col rounded-r-2xl border-r border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Lịch sử hội thoại</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setSidebarSearchOpen(!sidebarSearchOpen)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button onClick={beginNewConversation} className="h-8 w-8 rounded-lg bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 dark:hover:bg-blue-700 transition shadow-sm">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={fetchConversations} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <RefreshCcw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button onClick={() => setShowSidebar(false)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          {sidebarSearchOpen && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Lọc hội thoại..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 focus:border-blue-400 outline-none bg-white/60"
                />
                {sidebarSearch && (
                  <button onClick={() => setSidebarSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    x
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {isLoadingConversations ? (
              <div className="text-xs text-gray-500">Đang tải...</div>
            ) : (
              serverUnavailable ? (
                <div className="text-xs text-red-600">Không kết nối được với server</div>
              ) : (
                (sidebarSearch ? conversations.filter(c => (c.title || '').toLowerCase().includes(sidebarSearch.toLowerCase())) : conversations).length
                  ? (sidebarSearch ? conversations.filter(c => (c.title || '').toLowerCase().includes(sidebarSearch.toLowerCase())) : conversations).map((c) => (
                    <div key={c.id} className={`group flex items-center justify-between p-2 rounded-xl ${conversationId === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'}`}>
                      <button className="text-left text-sm flex-1 pr-2" onClick={() => openConversation(c.id)}>
                        {c.title || 'Chưa có tiêu đề'}
                      </button>
                      <div className="hidden group-hover:flex items-center gap-2">
                        <button className="h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" onClick={() => { setRenameTargetId(c.id); setRenameInput(c.title || ''); setIsRenameOpen(true) }}>
                          <Sparkles className="h-3.5 w-3.5 text-gray-700" />
                        </button>
                        <button className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center" onClick={() => deleteConversation(c.id)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                  : <div className="text-xs text-gray-500">Chưa có hội thoại</div>
              )
            )}
          </div>
        </div>
      )}
      {isMobile && (
        <Drawer open={showSidebar} onOpenChange={setShowSidebar} direction="left">
          <DrawerContent className="data-[vaul-drawer-direction=left]:w-full data-[vaul-drawer-direction=left]:max-w-none data-[vaul-drawer-direction=left]:border-r p-0">
            <DrawerTitle className="sr-only">Lịch sử hội thoại</DrawerTitle>
            <div className="h-[100dvh] bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold text-slate-800">Lịch sử hội thoại</span>
                <button onClick={() => setShowSidebar(false)} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center" type="button">
                  <X className="h-4 w-4 text-slate-700" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-4 py-3">
                <button onClick={() => setSidebarSearchOpen(!sidebarSearchOpen)} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center" type="button">
                  <Search className="h-4 w-4 text-slate-700" />
                </button>
                <button onClick={beginNewConversation} className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow" type="button">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={fetchConversations} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center" type="button">
                  <RefreshCcw className="h-4 w-4 text-slate-700" />
                </button>
              </div>

              {sidebarSearchOpen && (
                <div className="px-4 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      placeholder="Lọc hội thoại..."
                      className="w-full pl-9 pr-9 py-2 text-sm rounded-2xl border border-gray-200 focus:border-blue-400 outline-none bg-white"
                    />
                    {sidebarSearch && (
                      <button onClick={() => setSidebarSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500" type="button">
                        x
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
                {isLoadingConversations ? (
                  <div className="text-sm text-gray-500">Đang tải...</div>
                ) : (
                  serverUnavailable ? (
                    <div className="text-sm text-red-600">Không kết nối được với server</div>
                  ) : (
                    (sidebarSearch ? conversations.filter(c => (c.title || '').toLowerCase().includes(sidebarSearch.toLowerCase())) : conversations).length
                      ? (sidebarSearch ? conversations.filter(c => (c.title || '').toLowerCase().includes(sidebarSearch.toLowerCase())) : conversations).map((c) => (
                        <div key={c.id} className={`flex items-center justify-between p-3 rounded-2xl border ${conversationId === c.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                          <button className="text-left text-sm flex-1 pr-2" onClick={() => { openConversation(c.id); setShowSidebar(false) }} type="button">
                            <div className="font-medium text-slate-800">{c.title || 'Chưa có tiêu đề'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{c.last_active ? new Date(c.last_active).toLocaleString('vi-VN') : ''}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <button className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center" onClick={() => { setRenameTargetId(c.id); setRenameInput(c.title || ''); setIsRenameOpen(true) }} type="button">
                              <Sparkles className="h-4 w-4 text-slate-700" />
                            </button>
                            <button className="h-9 w-9 rounded-full bg-red-600 text-white flex items-center justify-center" onClick={() => deleteConversation(c.id)} type="button">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                      : <div className="text-sm text-gray-500">Chưa có hội thoại</div>
                  )
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {!showSidebar && (
          <div className="p-2">
            <button onClick={() => setShowSidebar(true)} className="text-xs px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200">Mở lịch sử</button>
          </div>
        )}
      {/* Input and actions moved to bottom */}
      {/* Medical Disclaimer */}
      {!disclaimerDismissed && (
        isDisclaimerCollapsed ? (
          <div className="mx-4 mb-3">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-amber-500 dark:bg-amber-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">Lưu ý quan trọng</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsDisclaimerCollapsed(false)} className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/70 transition">Mở</button>
                <button onClick={() => { setDisclaimerDismissed(true); try { localStorage.setItem('dismiss_disclaimer', '1') } catch {} }} className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/70 transition">Ẩn</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 m-4 mb-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500 dark:bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div className="text-sm flex-1">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-amber-800 dark:text-amber-200 font-semibold">Lưu ý quan trọng</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setIsDisclaimerCollapsed(true)} className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/70 transition">Thu nhỏ</button>
                    <button onClick={() => { setDisclaimerDismissed(true); try { localStorage.setItem('dismiss_disclaimer', '1') } catch {} }} className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/70 transition">Ẩn</button>
                  </div>
                </div>
                <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                  Thông tin này chỉ mang tính chất tham khảo. Vui lòng tham khảo ý kiến bác sĩ chuyên khoa để được chẩn đoán và điều trị chính xác.
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto px-4 min-h-0"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        <div className="space-y-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start space-x-2 ${
              message.isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            {!message.isUser && (
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="h-3 w-3 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] px-3 py-2 shadow-[0px_2px_6px_rgba(0,0,0,0.05)] ${
                message.isUser
                  ? 'bg-blue-500 text-white rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[12px] rounded-br-[4px]'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[4px]'
              }`}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {message.isUser ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              ) : (
                <div className="text-sm prose prose-sm dark:prose-invert leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              )}
              {!message.isUser && (
                <div className="flex justify-end mt-2 space-x-1">
                  {/* Nút Play/Pause */}
                  {isPlayingAudio === message.id ? (
                    <button
                      onClick={() => handlePauseAudio(message.id)}
                      className="p-1 rounded-full bg-blue-500 text-white transition-colors duration-200 hover:bg-blue-600"
                      title="Tạm dừng"
                    >
                      <Pause className="h-3 w-3" />
                    </button>
                  ) : isPausedAudio === message.id ? (
                    <button
                      onClick={() => handleResumeAudio(message.id)}
                      className="p-1 rounded-full bg-green-500 text-white transition-colors duration-200 hover:bg-green-600"
                      title="Tiếp tục"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTextToSpeech(message.id, message.content)}
                      className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200"
                      title="Nghe tin nhắn"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                  )}
                  
                  {/* Nút Stop - chỉ hiện khi đang phát hoặc tạm dừng */}
                  {(isPlayingAudio === message.id || isPausedAudio === message.id) && (
                    <button
                      onClick={handleStopAudio}
                      className="p-1 rounded-full bg-red-500 text-white transition-colors duration-200 hover:bg-red-600"
                      title="Dừng"
                    >
                      <Square className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {message.isUser && (
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Animation */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[4px] px-3 py-2 shadow-[0px_2px_6px_rgba(0,0,0,0.05)]">
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  <span>Đang trả lời</span>
                  <span className="inline-block w-[8px] h-[16px] align-middle bg-gray-600 dark:bg-gray-300 ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <UnifiedComposer
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        suggestedQuestions={suggestedQuestions}
        onSuggestedQuestion={handleSuggestedQuestion}
        showTools={showTools}
        onToggleTools={() => setShowTools(!showTools)}
        fileInputRef={fileInputRef}
        docInputRef={docInputRef}
        onImageChange={handleImageChange}
        onDocChange={handleDocChange}
        selectedImage={
          selectedImageBase64
            ? { base64: selectedImageBase64, name: selectedImageName, mime: selectedImageMime }
            : null
        }
        onRemoveImage={handleRemoveImage}
        selectedDocName={selectedDocName}
        onRemoveDoc={handleRemoveDoc}
        selectedModel={selectedModel}
        onSelectedModelChange={setSelectedModel}
        onStartNewConversation={startNewConversation}
        isRecording={isRecording}
        onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
        onGotoSpeechChat={() => router.push("/speech-chat")}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        agentMode={agentMode}
        onToggleAgentMode={toggleAgentMode}
        isLiveMode={liveMode}
        onToggleLiveMode={toggleLiveMode}
        isTextLiveMode={textLiveMode}
        onToggleTextLiveMode={toggleTextLiveMode}
        onManageKey={() => setAuthOpen(true)}
      />
      </div>
    </div>
  )
}
