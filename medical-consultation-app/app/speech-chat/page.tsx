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
        
        // Dừng tất cả tracks để tắt microphone
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)
      recorder.start()
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.')
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
        // Lưu thông tin chunking nếu có
        if (data.chunking_used) {
          setLastChunkingInfo(data.chunking_used)
        }
        
        // Thêm tin nhắn của user
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.user_text,
          isUser: true,
          timestamp: new Date()
        }
        
        // Thêm tin nhắn của AI
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
        
        // Tự động phát âm thanh phản hồi nếu có và được bật
        if (autoPlayResponse && data.audio_url) {
          console.log('Audio URL received:', data.audio_url)
          setTimeout(() => {
            handleTextToSpeechFromUrl(aiMessage.id, data.audio_url)
          }, 500)
        }
      } else {
        console.error('Speech-chat error:', data.error)
        alert(`Có lỗi xảy ra: ${data.error}`)
      }
    } catch (error) {
      console.error('Error processing speech-chat:', error)
      alert('Có lỗi xảy ra khi xử lý âm thanh.')
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
        // Thêm tin nhắn của user với ảnh
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.text,
          isUser: true,
          timestamp: new Date(),
          imageBase64: capturedImage || undefined
        }
        
        setMessages(prev => [...prev, userMessage])
        
        // Gửi tin nhắn đến AI với vision API
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
            alert('Có lỗi xảy ra khi xử lý ảnh và văn bản.')
          }
        }
      } else {
        console.error('Speech-to-text error:', data.error)
        alert('Không thể chuyển đổi giọng nói thành văn bản. Vui lòng thử lại.')
      }
    } catch (error) {
      console.error('Error processing speech-to-text with image:', error)
      alert('Có lỗi xảy ra khi xử lý âm thanh và ảnh.')
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
        // Thêm tin nhắn của user
        const userMessage: Message = {
          id: Date.now().toString(),
          content: data.text,
          isUser: true,
          timestamp: new Date(),
          imageBase64: capturedImage || undefined
        }
        
        setMessages(prev => [...prev, userMessage])
        
        // Gửi tin nhắn đến AI (với image nếu có)
        await sendToAI(data.text, capturedImage || undefined)
        
        // Clear captured image after sending
        if (capturedImage) {
          clearCapturedImage()
        }
      } else {
        console.error('Speech-to-text error:', data.error)
        alert('Không thể chuyển đổi giọng nói thành văn bản. Vui lòng thử lại.')
      }
    } catch (error) {
      console.error('Error processing speech-to-text:', error)
      alert('Có lỗi xảy ra khi xử lý âm thanh.')
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
        aiResponse = data.response || 'Xin lỗi, tôi không thể trả lời câu hỏi này.'
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Tự động phát âm thanh phản hồi nếu được bật
      if (autoPlayResponse) {
        setTimeout(() => {
          handleTextToSpeech(aiMessage.id, aiResponse)
        }, 500)
      }

    } catch (error) {
      console.error('Error sending to AI:', error)
      alert('Có lỗi xảy ra khi gửi tin nhắn.')
    }
  }

  const handleTextToSpeechFromUrl = async (messageId: string, audioUrl: string) => {
    try {
      console.log('Playing audio from URL:', audioUrl)
      
      // Dừng audio hiện tại nếu có
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
      // Dừng audio hiện tại nếu có
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      setIsPlayingAudio(messageId)
      setIsPausedAudio(null)

      // Phát theo luồng để bắt đầu nghe sớm trong khi xử lý phần sau
      const streamUrl = `/api/text-to-speech-stream?text=${encodeURIComponent(text)}&lang=vi`
      const audio = new Audio(streamUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlayingAudio(null)
        setIsPausedAudio(null)
      }

      audio.onerror = async () => {
        // Fallback: dùng API tạo file nếu luồng gặp lỗi
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
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.')
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
    ? "Trợ lý đang lắng nghe triệu chứng của bạn theo thời gian thực."
    : isLoading
      ? "Đang chuyển giọng nói thành nội dung và tạo phản hồi AI."
      : "Nhấn microphone để bắt đầu tư vấn giọng nói hoặc thêm ảnh để mô tả rõ hơn."

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
            <div className="text-3xl font-bold">Khẩn cấp</div>
            <div className="text-lg">Nếu bạn đang có nguy cơ tự làm hại bản thân hoặc người khác, hãy liên hệ hỗ trợ ngay:</div>
            <div className="space-y-2 text-xl font-semibold">
              {(sosHotlines.length ? sosHotlines : [{ label: "Cấp cứu", number: "115" }, { label: "Bảo vệ trẻ em", number: "111" }]).map((h) => (
                <div key={`${h.label}-${h.number}`}>{h.label}: {h.number}</div>
              ))}
            </div>
            <div className="text-base">
              Nếu bạn ở một mình, hãy gọi người thân/bạn bè và ở nơi an toàn (tránh ban công/dao/thuốc).
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSosOpen(false)} className="rounded-lg bg-card px-4 py-2 font-semibold text-destructive dark:text-destructive">
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 gap-4 px-3 py-3 sm:px-4">
          <aside className="hidden min-h-0 w-72 shrink-0 lg:flex lg:flex-col lg:gap-4">
            <SectionCard
              title="Transcript gần đây"
              description="Các tương tác mới nhất trong phiên nói chuyện."
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
                      {message.isUser ? "Bạn" : "AI"}
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-foreground">{message.content}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-secondary/55 px-4 py-6 text-sm text-muted-foreground">
                  Chưa có transcript. Nhấn microphone để bắt đầu phiên tư vấn giọng nói.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Input trợ giúp" description="Bạn có thể nói, chụp ảnh hoặc tải ảnh lên để AI phân tích thêm.">
              <div className="grid gap-3">
                <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-primary">
                    <Mic className="h-4 w-4" />
                    Voice first
                  </div>
                  Ưu tiên mô tả triệu chứng bằng giọng nói để AI hiểu ngữ cảnh tự nhiên hơn.
                </div>
                <div className="rounded-xl bg-secondary/55 px-4 py-3 text-sm text-foreground">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <ImageIcon className="h-4 w-4 text-teal-accent" />
                    Vision assist
                  </div>
                  Ảnh giúp hỗ trợ quan sát tổn thương ngoài da, đơn thuốc hoặc chỉ số trên giấy khám.
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
                        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Tư vấn Giọng nói</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                          Giao tiếp tự nhiên với trợ lý y tế bằng voice-first flow, hỗ trợ thêm hình ảnh và phát phản hồi bằng giọng nói.
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
                      {autoPlayResponse ? "Tự động phát" : "Phát thủ công"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseOptimizedAPI((v) => !v)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${useOptimizedAPI ? "border-teal-accent bg-teal-accent text-white" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                    >
                      {useOptimizedAPI ? "API tối ưu" : "API thường"}
                    </button>
                  </div>
                </div>

                {lastChunkingInfo ? (
                  <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <span className="font-semibold">Tối ưu hóa được áp dụng:</span>
                    <span className="ml-2 font-mono">
                      STT: {lastChunkingInfo.speech_to_text ? '✓' : '✗'} | TTS: {lastChunkingInfo.text_to_speech ? '✓' : '✗'}
                      {lastChunkingInfo.chunks_processed && ` | ${lastChunkingInfo.chunks_processed} đoạn`}
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
                        {latestUserMessage?.content ? `"${latestUserMessage.content}"` : "“Mô tả triệu chứng bằng giọng nói để AI ghi nhận và phản hồi trực tiếp.”"}
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
                    title="Hội thoại"
                    description="Tin nhắn phát sinh trong phiên voice consultation hiện tại."
                    contentClassName="custom-scrollbar flex-1 min-h-[260px] max-h-[520px] space-y-6 overflow-y-auto"
                  >
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Mic className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">Chào bạn</h2>
                        <p className="max-w-xs text-muted-foreground">
                          Nhấn nút microphone bên dưới để bắt đầu tư vấn sức khỏe bằng giọng nói.
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
                                    title="Tạm dừng"
                                  >
                                    <Pause className="h-4 w-4" />
                                  </button>
                                ) : isPausedAudio === message.id ? (
                                  <button
                                    onClick={() => handleResumeAudio(message.id)}
                                    className="rounded-xl bg-teal-accent p-2 text-white transition-all duration-200 active:scale-95"
                                    title="Tiếp tục"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTextToSpeech(message.id, message.content)}
                                    className="rounded-xl bg-secondary p-2 text-foreground transition-all duration-200 active:scale-95"
                                    title="Nghe tin nhắn"
                                  >
                                    <Volume2 className="h-4 w-4" />
                                  </button>
                                )}
                                {(isPlayingAudio === message.id || isPausedAudio === message.id) ? (
                                  <button
                                    onClick={handleStopAudio}
                                    className="rounded-xl bg-destructive p-2 text-destructive-foreground transition-all duration-200 active:scale-95"
                                    title="Dừng"
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
                            <span className="text-sm font-medium text-muted-foreground">Đang xử lý...</span>
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
                    description="Thiết lập chính cho phiên voice consultation hiện tại."
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
                      <div className="text-sm text-muted-foreground">{autoPlayResponse ? "Tự động phát phản hồi đang bật." : "Phản hồi chỉ phát khi bạn chủ động nhấn nghe."}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/55 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-teal-accent" />
                        Runtime mode
                      </div>
                      <div className="text-sm text-muted-foreground">{useOptimizedAPI ? "Đang dùng luồng speech-chat tối ưu." : "Đang dùng luồng speech/text tiêu chuẩn."}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/55 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ImageIcon className="h-4 w-4 text-violet-500" />
                        Vision input
                      </div>
                      <div className="text-sm text-muted-foreground">{capturedImage ? "Đã có ảnh sẵn sàng gửi cùng mô tả." : "Chưa có ảnh nào được đính kèm."}</div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Secure Channel" description="Thông tin phiên tư vấn được giữ trong luồng xử lý an toàn của hệ thống.">
                    <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
                      <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Protected</span>
                      </div>
                      <p className="text-sm leading-6 text-primary-foreground/85">
                        Voice data chỉ được xử lý cho phiên hiện tại; hệ thống ưu tiên kênh bảo mật và fallback có kiểm soát.
                      </p>
                    </div>
                  </SectionCard>

                  <SectionCard title="Quick Route" description="Đi sang các luồng hỗ trợ khác nếu cần.">
                    <div className="grid gap-3">
                      <Link href="/tu-van" className="rounded-xl bg-secondary/55 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary">
                        Mở tư vấn văn bản
                      </Link>
                      <Link href="/tam-su" className="rounded-xl bg-secondary/55 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary">
                        Chuyển sang tâm sự
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
                 Chụp ảnh
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
                   Chụp ảnh
                 </button>
                 
                 <button
                   onClick={stopCamera}
                   className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors duration-200"
                 >
                   Hủy
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

