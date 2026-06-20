'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Mic, Volume2, Pause, Play, Square, ArrowLeft, MessageCircle, Camera, X, Image as ImageIcon, ShieldCheck, Sparkles, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { normalizeRuntimeProvider } from '@/lib/runtime-sync'
import { SectionCard } from '@/components/ui/section-card'
import { SpeechControlDock } from '@/components/speech/speech-control-dock'
import { VoiceWaveVisualizer } from '@/components/speech/voice-wave-visualizer'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  imageBase64?: string
}

export default function SpeechChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null)
  const [isPausedAudio, setIsPausedAudio] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [autoPlayResponse, setAutoPlayResponse] = useState(true)
  const [useOptimizedAPI, setUseOptimizedAPI] = useState(true)
  const [lastChunkingInfo, setLastChunkingInfo] = useState<any>(null)
  const [sosOpen, setSosOpen] = useState(false)
  const [sosHotlines, setSosHotlines] = useState<Array<{ label: string; number: string }>>([])
  
  // Camera and Image states
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Determine the best supported audio format
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }
      
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        // Use the actual recorded MIME type, not force it to wav
        const audioBlob = new Blob(chunks, { type: mimeType })
        
        // If there's a captured image, use the vision API path
        if (capturedImage) {
          await handleSpeechToTextWithImage(audioBlob)
        } else if (useOptimizedAPI) {
          await handleOptimizedSpeechChat(audioBlob)
        } else {
          await handleSpeechToText(audioBlob)
        }
        
        // Dá»«ng táº¥t cáº£ tracks Ä‘á»ƒ táº¯t microphone
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)
      recorder.start()
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('KhÃ´ng thá»ƒ truy cáº­p microphone. Vui lÃ²ng kiá»ƒm tra quyá»n truy cáº­p.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const handleOptimizedSpeechChat = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      
      const formData = new FormData()
      const fname1 = audioBlob.type.includes('webm')
        ? 'recording.webm'
        : audioBlob.type.includes('ogg')
        ? 'recording.ogg'
        : audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')
        ? 'recording.m4a'
        : 'recording.wav'
      formData.append('audio_file', audioBlob, fname1)
      formData.append('context', 'health consultation')
      formData.append('conversation_history', JSON.stringify(messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }))))
      formData.append('use_optimized', 'true')
      try {
        const p = typeof window !== 'undefined' ? localStorage.getItem('llm_provider') : null
        formData.append('provider', normalizeRuntimeProvider(p))
      } catch {
        formData.append('provider', 'server')
      }

      const response = await fetch('/api/speech-chat', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success && data.user_text && data.ai_response) {
        // LÆ°u thÃ´ng tin chunking náº¿u cÃ³
        if (data.chunking_used) {
          setLastChunkingInfo(data.chunking_used)
        }
        
        // ThÃªm tin nháº¯n cá»§a user
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.user_text,
          isUser: true,
          timestamp: new Date()
        }
        
        // ThÃªm tin nháº¯n cá»§a AI
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.ai_response,
          isUser: false,
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, userMessage, aiMessage])

        if (data?.metadata?.sos) {
          try {
            const hs = Array.isArray(data?.metadata?.hotlines) ? data.metadata.hotlines : []
            setSosHotlines(hs.map((h: any) => ({ label: String(h?.label || ''), number: String(h?.number || '') })).filter((h: any) => h.label && h.number))
          } catch {
            setSosHotlines([])
          }
          setSosOpen(true)
        }
        
        // Tá»± Ä‘á»™ng phÃ¡t Ã¢m thanh pháº£n há»“i náº¿u cÃ³ vÃ  Ä‘Æ°á»£c báº­t
        if (autoPlayResponse && data.audio_url) {
          console.log('Audio URL received:', data.audio_url)
          setTimeout(() => {
            handleTextToSpeechFromUrl(aiMessage.id, data.audio_url)
          }, 500)
        }
      } else {
        console.error('Speech-chat error:', data.error)
        alert(`CÃ³ lá»—i xáº£y ra: ${data.error}`)
      }
    } catch (error) {
      console.error('Error processing speech-chat:', error)
      alert('CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ã¢m thanh.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpeechToTextWithImage = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      
      // First, convert speech to text
      const formData = new FormData()
      const fname2 = audioBlob.type.includes('webm')
        ? 'recording.webm'
        : audioBlob.type.includes('ogg')
        ? 'recording.ogg'
        : audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')
        ? 'recording.m4a'
        : 'recording.wav'
      formData.append('audio_file', audioBlob, fname2)

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success && data.text) {
        // ThÃªm tin nháº¯n cá»§a user vá»›i áº£nh
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.text,
          isUser: true,
          timestamp: new Date(),
          imageBase64: capturedImage || undefined
        }
        
        setMessages(prev => [...prev, userMessage])
        
        // Gá»­i tin nháº¯n Ä‘áº¿n AI vá»›i vision API
        if (capturedImage) {
          try {
            const aiResponse = await sendImageWithText(data.text, capturedImage)
            
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: aiResponse,
              isUser: false,
              timestamp: new Date()
            }
            
            setMessages(prev => [...prev, aiMessage])
            
            // Clear captured image after sending
            clearCapturedImage()
            
            // Auto-play response if enabled
            if (autoPlayResponse) {
              setTimeout(() => {
                handleTextToSpeech(aiMessage.id, aiResponse)
              }, 500)
            }
          } catch (error) {
            console.error('Error with vision API:', error)
            alert('CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ áº£nh vÃ  vÄƒn báº£n.')
          }
        }
      } else {
        console.error('Speech-to-text error:', data.error)
        alert('KhÃ´ng thá»ƒ chuyá»ƒn Ä‘á»•i giá»ng nÃ³i thÃ nh vÄƒn báº£n. Vui lÃ²ng thá»­ láº¡i.')
      }
    } catch (error) {
      console.error('Error processing speech-to-text with image:', error)
      alert('CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ã¢m thanh vÃ  áº£nh.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpeechToText = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      
      const formData = new FormData()
      const fname3 = audioBlob.type.includes('webm')
        ? 'recording.webm'
        : audioBlob.type.includes('ogg')
        ? 'recording.ogg'
        : audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')
        ? 'recording.m4a'
        : 'recording.wav'
      formData.append('audio_file', audioBlob, fname3)

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success && data.text) {
        // ThÃªm tin nháº¯n cá»§a user
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.text,
          isUser: true,
          timestamp: new Date(),
          imageBase64: capturedImage || undefined
        }
        
        setMessages(prev => [...prev, userMessage])
        
        // Gá»­i tin nháº¯n Ä‘áº¿n AI (vá»›i image náº¿u cÃ³)
        await sendToAI(data.text, capturedImage || undefined)
        
        // Clear captured image after sending
        if (capturedImage) {
          clearCapturedImage()
        }
      } else {
        console.error('Speech-to-text error:', data.error)
        alert('KhÃ´ng thá»ƒ chuyá»ƒn Ä‘á»•i giá»ng nÃ³i thÃ nh vÄƒn báº£n. Vui lÃ²ng thá»­ láº¡i.')
      }
    } catch (error) {
      console.error('Error processing speech-to-text:', error)
      alert('CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ã¢m thanh.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendToAI = async (userInput: string, imageBase64?: string) => {
    try {
      let aiResponse: string

      if (imageBase64) {
        // Use vision API for image + text
        aiResponse = await sendImageWithText(userInput, imageBase64)
      } else {
        // Use regular text API
        const response = await fetch('/api/llm-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userInput,
            context: 'health consultation',
            conversationHistory: messages.map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.content
            }))
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get AI response')
        }

        const data = await response.json()
        aiResponse = data.response || 'Xin lá»—i, tÃ´i khÃ´ng thá»ƒ tráº£ lá»i cÃ¢u há»i nÃ y.'
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Tá»± Ä‘á»™ng phÃ¡t Ã¢m thanh pháº£n há»“i náº¿u Ä‘Æ°á»£c báº­t
      if (autoPlayResponse) {
        setTimeout(() => {
          handleTextToSpeech(aiMessage.id, aiResponse)
        }, 500)
      }

    } catch (error) {
      console.error('Error sending to AI:', error)
      alert('CÃ³ lá»—i xáº£y ra khi gá»­i tin nháº¯n.')
    }
  }

  const handleTextToSpeechFromUrl = async (messageId: string, audioUrl: string) => {
    try {
      console.log('Playing audio from URL:', audioUrl)
      
      // Dá»«ng audio hiá»‡n táº¡i náº¿u cÃ³
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      setIsPlayingAudio(messageId)
      setIsPausedAudio(null)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
      }

      audio.onerror = () => {
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
        console.error('Error playing audio')
      }

      await audio.play()
    } catch (error) {
      console.error('Error playing audio from URL:', error)
      setIsPlayingAudio(null)
    }
  }

  const handleTextToSpeech = async (messageId: string, text: string) => {
    try {
      // Dá»«ng audio hiá»‡n táº¡i náº¿u cÃ³
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      setIsPlayingAudio(messageId)
      setIsPausedAudio(null)

      // PhÃ¡t theo luá»“ng Ä‘á»ƒ báº¯t Ä‘áº§u nghe sá»›m trong khi xá»­ lÃ½ pháº§n sau
      const streamUrl = `/api/text-to-speech-stream?text=${encodeURIComponent(text)}&lang=vi`
      const audio = new Audio(streamUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
      }

      audio.onerror = async () => {
        // Fallback: dÃ¹ng API táº¡o file náº¿u luá»“ng gáº·p lá»—i
        try {
          const response = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang: 'vi' }),
          })
          const data = await response.json()
          if (data.success && data.audio_url) {
            const altAudio = new Audio(data.audio_url)
            audioRef.current = altAudio
            altAudio.onended = () => {
              setIsPlayingAudio(null)
              setIsPausedAudio(null)
            }
            altAudio.onerror = () => {
              setIsPlayingAudio(null)
              setIsPausedAudio(null)
            }
            await altAudio.play()
          } else {
            setIsPlayingAudio(null)
            setIsPausedAudio(null)
          }
        } catch (e) {
          console.error('Fallback TTS error:', e)
          setIsPlayingAudio(null)
          setIsPausedAudio(null)
        }
      }

      await audio.play()
    } catch (error) {
      console.error('Error with text-to-speech:', error)
      setIsPlayingAudio(null)
    }
  }

  const handlePauseAudio = (messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlayingAudio(null)
      setIsPausedAudio(messageId)
    }
  }

  const handleResumeAudio = (messageId: string) => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlayingAudio(messageId)
      setIsPausedAudio(null)
    }
  }

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAudio(null)
    setIsPausedAudio(null)
  }

  // Camera and Image handling functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setCameraStream(stream)
      setShowCamera(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('KhÃ´ng thá»ƒ truy cáº­p camera. Vui lÃ²ng kiá»ƒm tra quyá»n truy cáº­p.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
    setCapturedImage(null)
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageDataUrl)
        setIsCapturing(true)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setCapturedImage(result)
        setIsCapturing(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearCapturedImage = () => {
    setCapturedImage(null)
    setIsCapturing(false)
  }

  const sendImageWithText = async (text: string, imageBase64: string) => {
    try {
      const response = await fetch('/api/backend/v1/vision-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          image_base64: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
          temperature: 0.7,
          max_tokens: 1000
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        return data.response
      } else {
        throw new Error(data.error || 'Vision API error')
      }
    } catch (error) {
      console.error('Error with vision chat:', error)
      throw error
    }
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.isUser)
  const recentMessages = useMemo(() => messages.slice(-6), [messages])
  const voiceStatusLabel = isRecording ? "Listening..." : isLoading ? "Processing..." : "Ready to listen"
  const voiceStatusDescription = isRecording
    ? "Trá»£ lÃ½ Ä‘ang láº¯ng nghe triá»‡u chá»©ng cá»§a báº¡n theo thá»i gian thá»±c."
    : isLoading
      ? "Äang chuyá»ƒn giá»ng nÃ³i thÃ nh ná»™i dung vÃ  táº¡o pháº£n há»“i AI."
      : "Nháº¥n microphone Ä‘á»ƒ báº¯t Ä‘áº§u tÆ° váº¥n giá»ng nÃ³i hoáº·c thÃªm áº£nh Ä‘á»ƒ mÃ´ táº£ rÃµ hÆ¡n."

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/45" suppressHydrationWarning>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-20 top-8 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="animate-blob absolute right-0 top-1/3 h-80 w-80 rounded-full bg-teal-accent/10 blur-[130px]" style={{ animationDelay: '4s' }} />
        <div className="animate-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/8 blur-[110px]" style={{ animationDelay: '8s' }} />
      </div>

      {sosOpen ? (
        <div className="fixed inset-0 z-50 bg-red-700/95 text-white">
          <div className="mx-auto max-w-2xl space-y-5 p-6 sm:p-10">
            <div className="text-3xl font-bold">Kháº©n cáº¥p</div>
            <div className="text-lg">Náº¿u báº¡n Ä‘ang cÃ³ nguy cÆ¡ tá»± lÃ m háº¡i báº£n thÃ¢n hoáº·c ngÆ°á»i khÃ¡c, hÃ£y liÃªn há»‡ há»— trá»£ ngay:</div>
            <div className="space-y-2 text-xl font-semibold">
              {(sosHotlines.length ? sosHotlines : [{ label: "Cáº¥p cá»©u", number: "115" }, { label: "Báº£o vá»‡ tráº» em", number: "111" }]).map((h) => (
                <div key={`${h.label}-${h.number}`}>{h.label}: {h.number}</div>
              ))}
            </div>
            <div className="text-base">
              Náº¿u báº¡n á»Ÿ má»™t mÃ¬nh, hÃ£y gá»i ngÆ°á»i thÃ¢n/báº¡n bÃ¨ vÃ  á»Ÿ nÆ¡i an toÃ n (trÃ¡nh ban cÃ´ng/dao/thuá»‘c).
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSosOpen(false)} className="rounded-lg bg-card px-4 py-2 font-semibold text-destructive dark:text-destructive">
                ÄÃ£ hiá»ƒu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 gap-4 px-3 py-3 sm:px-4">
          <aside className="hidden min-h-0 w-72 shrink-0 lg:flex lg:flex-col lg:gap-4">
            <SectionCard
              title="Transcript gáº§n Ä‘Ã¢y"
              description="CÃ¡c tÆ°Æ¡ng tÃ¡c má»›i nháº¥t trong phiÃªn nÃ³i chuyá»‡n."
              badge={
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Session
                </span>
              }
              contentClassName="space-y-3"
            >
              {recentMessages.length ? (
                recentMessages.map((message) => (
                  <div key={message.id} className="rounded-xl bg-secondary/55 px-4 py-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {message.isUser ? "Báº¡n" : "AI"}
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-foreground">{message.content}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-secondary/55 px-4 py-6 text-sm text-muted-foreground">
                  ChÆ°a cÃ³ transcript. Nháº¥n microphone Ä‘á»ƒ báº¯t Ä‘áº§u phiÃªn tÆ° váº¥n giá»ng nÃ³i.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Input trá»£ giÃºp" description="Báº¡n cÃ³ thá»ƒ nÃ³i, chá»¥p áº£nh hoáº·c táº£i áº£nh lÃªn Ä‘á»ƒ AI phÃ¢n tÃ­ch thÃªm.">
              <div className="grid gap-3">
                <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-primary">
                    <Mic className="h-4 w-4" />
                    Voice first
                  </div>
                  Æ¯u tiÃªn mÃ´ táº£ triá»‡u chá»©ng báº±ng giá»ng nÃ³i Ä‘á»ƒ AI hiá»ƒu ngá»¯ cáº£nh tá»± nhiÃªn hÆ¡n.
                </div>
                <div className="rounded-xl bg-secondary/55 px-4 py-3 text-sm text-foreground">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <ImageIcon className="h-4 w-4 text-teal-accent" />
                    Vision assist
                  </div>
                  áº¢nh giÃºp há»— trá»£ quan sÃ¡t tá»•n thÆ°Æ¡ng ngoÃ i da, Ä‘Æ¡n thuá»‘c hoáº·c chá»‰ sá»‘ trÃªn giáº¥y khÃ¡m.
                </div>
              </div>
            </SectionCard>
          </aside>

          <section className="min-h-0 flex-1">
            <div className="glass-panel dark:glass-panel-dark flex h-full min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-border/60 shadow-[0_28px_80px_-38px_rgba(15,20,25,0.45)]">
              <div className="border-b border-border/70 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Voice Consultation
                    </div>
                    <div className="flex items-start gap-3">
                      <Link href="/" className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground transition hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                      <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">TÆ° váº¥n Giá»ng nÃ³i</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                          Giao tiáº¿p tá»± nhiÃªn vá»›i trá»£ lÃ½ y táº¿ báº±ng voice-first flow, há»— trá»£ thÃªm hÃ¬nh áº£nh vÃ  phÃ¡t pháº£n há»“i báº±ng giá»ng nÃ³i.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoPlayResponse((v) => !v)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${autoPlayResponse ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                    >
                      {autoPlayResponse ? "Tá»± Ä‘á»™ng phÃ¡t" : "PhÃ¡t thá»§ cÃ´ng"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseOptimizedAPI((v) => !v)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${useOptimizedAPI ? "border-teal-accent bg-teal-accent text-white" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                    >
                      {useOptimizedAPI ? "API tá»‘i Æ°u" : "API thÆ°á»ng"}
                    </button>
                  </div>
                </div>

                {lastChunkingInfo ? (
                  <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <span className="font-semibold">Tá»‘i Æ°u hÃ³a Ä‘Æ°á»£c Ã¡p dá»¥ng:</span>
                    <span className="ml-2 font-mono">
                      STT: {lastChunkingInfo.speech_to_text ? 'âœ“' : 'âœ—'} | TTS: {lastChunkingInfo.text_to_speech ? 'âœ“' : 'âœ—'}
                      {lastChunkingInfo.chunks_processed && ` | ${lastChunkingInfo.chunks_processed} Ä‘oáº¡n`}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-0 flex-col gap-4">
                  <SectionCard
                    title={voiceStatusLabel}
                    description={voiceStatusDescription}
                    badge={
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isRecording ? "bg-destructive/10 text-destructive" : isLoading ? "bg-primary/10 text-primary" : "bg-teal-accent/10 text-teal-accent"}`}>
                        {isRecording ? "Live" : isLoading ? "Thinking" : "Ready"}
                      </span>
                    }
                    className="overflow-hidden"
                    contentClassName="space-y-6"
                  >
                    <div className="rounded-[1.5rem] bg-gradient-to-br from-secondary/35 to-background px-4 py-8 text-center">
                      <p className="mx-auto max-w-2xl text-lg leading-8 text-foreground sm:text-2xl sm:leading-10">
                        {latestUserMessage?.content ? `"${latestUserMessage.content}"` : "â€œMÃ´ táº£ triá»‡u chá»©ng báº±ng giá»ng nÃ³i Ä‘á»ƒ AI ghi nháº­n vÃ  pháº£n há»“i trá»±c tiáº¿p.â€"}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4">
                      <VoiceWaveVisualizer active={isRecording || isLoading} />
                      <div className="text-center">
                        <div className="text-lg font-semibold text-foreground">{voiceStatusLabel}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{voiceStatusDescription}</div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Há»™i thoáº¡i"
                    description="Tin nháº¯n phÃ¡t sinh trong phiÃªn voice consultation hiá»‡n táº¡i."
                    contentClassName="custom-scrollbar flex-1 min-h-[260px] max-h-[520px] space-y-6 overflow-y-auto"
                  >
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Mic className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">ChÃ o báº¡n</h2>
                        <p className="max-w-xs text-muted-foreground">
                          Nháº¥n nÃºt microphone bÃªn dÆ°á»›i Ä‘á»ƒ báº¯t Ä‘áº§u tÆ° váº¥n sá»©c khá»e báº±ng giá»ng nÃ³i.
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs rounded-[1.4rem] px-5 py-4 shadow-sm transition-all lg:max-w-md ${
                              message.isUser
                                ? 'bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(20,71,230,0.85)]'
                                : 'border border-border/70 bg-card text-foreground'
                            }`}
                          >
                            {message.imageBase64 ? (
                              <div className="mb-2">
                                <img
                                  src={message.imageBase64}
                                  alt="Uploaded image"
                                  className="max-h-[200px] max-w-full rounded-lg object-cover"
                                />
                              </div>
                            ) : null}
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            {!message.isUser ? (
                              <div className="mt-3 flex justify-end space-x-2">
                                {isPlayingAudio === message.id ? (
                                  <button
                                    onClick={() => handlePauseAudio(message.id)}
                                    className="rounded-xl bg-primary p-2 text-primary-foreground transition-all duration-200 active:scale-95"
                                    title="Táº¡m dá»«ng"
                                  >
                                    <Pause className="h-4 w-4" />
                                  </button>
                                ) : isPausedAudio === message.id ? (
                                  <button
                                    onClick={() => handleResumeAudio(message.id)}
                                    className="rounded-xl bg-teal-accent p-2 text-white transition-all duration-200 active:scale-95"
                                    title="Tiáº¿p tá»¥c"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTextToSpeech(message.id, message.content)}
                                    className="rounded-xl bg-secondary p-2 text-foreground transition-all duration-200 active:scale-95"
                                    title="Nghe tin nháº¯n"
                                  >
                                    <Volume2 className="h-4 w-4" />
                                  </button>
                                )}
                                {(isPlayingAudio === message.id || isPausedAudio === message.id) ? (
                                  <button
                                    onClick={handleStopAudio}
                                    className="rounded-xl bg-destructive p-2 text-destructive-foreground transition-all duration-200 active:scale-95"
                                    title="Dá»«ng"
                                  >
                                    <Square className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}

                    {isLoading ? (
                      <div className="flex justify-start">
                        <div className="rounded-[1.3rem] border border-border/70 bg-card px-5 py-4 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1.5">
                              <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" />
                              <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" style={{ animationDelay: '0.1s' }} />
                              <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Äang xá»­ lÃ½...</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                  </SectionCard>
                </div>

                <aside className="hidden min-h-0 xl:flex xl:flex-col xl:gap-4">
                  <SectionCard
                    title="Voice Settings"
                    description="Thiáº¿t láº­p chÃ­nh cho phiÃªn voice consultation hiá»‡n táº¡i."
                    badge={
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Config
                      </span>
                    }
                    contentClassName="space-y-4"
                  >
                    <div className="rounded-xl bg-secondary/55 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Voice playback
                      </div>
                      <div className="text-sm text-muted-foreground">{autoPlayResponse ? "Tá»± Ä‘á»™ng phÃ¡t pháº£n há»“i Ä‘ang báº­t." : "Pháº£n há»“i chá»‰ phÃ¡t khi báº¡n chá»§ Ä‘á»™ng nháº¥n nghe."}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/55 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-teal-accent" />
                        Runtime mode
                      </div>
                      <div className="text-sm text-muted-foreground">{useOptimizedAPI ? "Äang dÃ¹ng luá»“ng speech-chat tá»‘i Æ°u." : "Äang dÃ¹ng luá»“ng speech/text tiÃªu chuáº©n."}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/55 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ImageIcon className="h-4 w-4 text-violet-500" />
                        Vision input
                      </div>
                      <div className="text-sm text-muted-foreground">{capturedImage ? "ÄÃ£ cÃ³ áº£nh sáºµn sÃ ng gá»­i cÃ¹ng mÃ´ táº£." : "ChÆ°a cÃ³ áº£nh nÃ o Ä‘Æ°á»£c Ä‘Ã­nh kÃ¨m."}</div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Secure Channel" description="ThÃ´ng tin phiÃªn tÆ° váº¥n Ä‘Æ°á»£c giá»¯ trong luá»“ng xá»­ lÃ½ an toÃ n cá»§a há»‡ thá»‘ng.">
                    <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
                      <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Protected</span>
                      </div>
                      <p className="text-sm leading-6 text-primary-foreground/85">
                        Voice data chá»‰ Ä‘Æ°á»£c xá»­ lÃ½ cho phiÃªn hiá»‡n táº¡i; há»‡ thá»‘ng Æ°u tiÃªn kÃªnh báº£o máº­t vÃ  fallback cÃ³ kiá»ƒm soÃ¡t.
                      </p>
                    </div>
                  </SectionCard>

                  <SectionCard title="Quick Route" description="Äi sang cÃ¡c luá»“ng há»— trá»£ khÃ¡c náº¿u cáº§n.">
                    <div className="grid gap-3">
                      <Link href="/tu-van" className="rounded-xl bg-secondary/55 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary">
                        Má»Ÿ tÆ° váº¥n vÄƒn báº£n
                      </Link>
                      <Link href="/tam-su" className="rounded-xl bg-secondary/55 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary">
                        Chuyá»ƒn sang tÃ¢m sá»±
                      </Link>
                    </div>
                  </SectionCard>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>

      <SpeechControlDock
        isLoading={isLoading}
        isRecording={isRecording}
        capturedImage={capturedImage}
        onStartCamera={startCamera}
        onUploadClick={() => fileInputRef.current?.click()}
        onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
        onClearCapturedImage={clearCapturedImage}
      />

      {/* Hidden File Input */}
      <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         onChange={handleFileUpload}
         className="hidden"
       />

       {/* Camera Modal */}
       {showCamera && (
         <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
           <div className="bg-card dark:bg-card/95 rounded-lg p-4 max-w-md w-full mx-4 border border-border">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-foreground">
                 Chá»¥p áº£nh
               </h3>
               <button
                 onClick={stopCamera}
                 className="text-muted-foreground hover:text-foreground transition-colors"
               >
                 <X className="h-6 w-6" />
               </button>
             </div>
             
             <div className="relative">
               <video
                 ref={videoRef}
                 autoPlay
                 playsInline
                 className="w-full h-64 bg-background rounded-lg object-cover"
               />
               
               <div className="flex justify-center mt-4 space-x-4">
                 <button
                   onClick={captureImage}
                   className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200"
                 >
                   <Camera className="h-5 w-5 inline mr-2" />
                   Chá»¥p áº£nh
                 </button>
                 
                 <button
                   onClick={stopCamera}
                   className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors duration-200"
                 >
                   Há»§y
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Hidden Canvas for Image Capture */}
       <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

