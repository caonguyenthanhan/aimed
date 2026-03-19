'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Volume2, Pause, Play, Square, ArrowLeft, MessageCircle, Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

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
        formData.append('provider', (p === 'gemini' || p === 'server') ? p : 'server')
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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 hero-gradient dark:hero-gradient-dark" suppressHydrationWarning>
      {sosOpen ? (
        <div className="fixed inset-0 z-50 bg-red-700/95 text-white">
          <div className="max-w-2xl mx-auto p-6 sm:p-10 space-y-5">
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
              <button onClick={() => setSosOpen(false)} className="px-4 py-2 rounded-lg bg-white text-red-700 font-semibold">
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Header */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    Tư vấn Giọng nói
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Giao tiếp tự nhiên với trợ lý y tế</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-50 transition">
                <input
                  type="checkbox"
                  checked={autoPlayResponse}
                  onChange={(e) => setAutoPlayResponse(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Tự động phát</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-50 transition">
                <input
                  type="checkbox"
                  checked={useOptimizedAPI}
                  onChange={(e) => setUseOptimizedAPI(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">API tối ưu</span>
              </label>
            </div>
          </div>
          
          {/* Chunking Info */}
          {lastChunkingInfo && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 text-sm text-emerald-700 dark:text-emerald-300">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Tối ưu hóa được áp dụng:</span>
                  <span className="font-mono">
                    STT: {lastChunkingInfo.speech_to_text ? '✓' : '✗'} | 
                    TTS: {lastChunkingInfo.text_to_speech ? '✓' : '✗'}
                    {lastChunkingInfo.chunks_processed && ` | ${lastChunkingInfo.chunks_processed} đoạn`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-44 sm:pb-8">
        {/* Mobile Header */}
        <div className="sm:hidden mb-6">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Tư vấn Giọng nói</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAutoPlayResponse(v => !v)}
              className={`text-xs px-4 py-2 rounded-lg border font-medium transition ${autoPlayResponse ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-50 border-slate-200 dark:border-slate-700"}`}
            >
              {autoPlayResponse ? '🔊 Tự động phát' : '🔇 Tắt phát'}
            </button>
            <button
              type="button"
              onClick={() => setUseOptimizedAPI(v => !v)}
              className={`text-xs px-4 py-2 rounded-lg border font-medium transition ${useOptimizedAPI ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-50 border-slate-200 dark:border-slate-700"}`}
            >
              {useOptimizedAPI ? '⚡ API tối ưu' : '⏱️ API thường'}
            </button>
          </div>
        </div>
        <div className="space-y-6 mb-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/30 mb-6">
                <Mic className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">
                Chào bạn
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xs mx-auto mb-8">
                Nh���n nút microphone bên dưới để bắt đầu tư vấn sức khỏe bằng giọng nói
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                <span>Ghi âm tự động xử lý</span>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-5 py-4 rounded-2xl transition-all ${
                    message.isUser
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 shadow-md'
                  }`}
                >
                  {/* Display image if present */}
                  {message.imageBase64 && (
                    <div className="mb-2">
                      <img 
                        src={message.imageBase64} 
                        alt="Uploaded image" 
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}
                  
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {!message.isUser && (
                    <div className="flex justify-end mt-3 space-x-2">
                      {/* Audio Control Buttons */}
                      {isPlayingAudio === message.id ? (
                        <button
                          onClick={() => handlePauseAudio(message.id)}
                          className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 active:scale-95 shadow-sm"
                          title="Tạm dừng"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : isPausedAudio === message.id ? (
                        <button
                          onClick={() => handleResumeAudio(message.id)}
                          className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all duration-200 active:scale-95 shadow-sm"
                          title="Tiếp tục"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTextToSpeech(message.id, message.content)}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-200 active:scale-95"
                          title="Nghe tin nhắn"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Stop Button */}
                      {(isPlayingAudio === message.id || isPausedAudio === message.id) && (
                        <button
                          onClick={handleStopAudio}
                          className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 active:scale-95 shadow-sm"
                          title="Dừng"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Đang xử lý...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Control Buttons */}
      <div className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] sm:bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-4">
          {/* Camera Button */}
          <button
            onClick={startCamera}
            disabled={isLoading || isRecording}
            className="w-12 h-12 rounded-full bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Chụp ảnh"
          >
            <Camera className="h-6 w-6 mx-auto" />
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording}
            className="w-12 h-12 rounded-full bg-purple-600 dark:bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Tải ảnh lên"
          >
            <Upload className="h-6 w-6 mx-auto" />
          </button>

          {/* Recording Button with Listening Effect */}
          <div className="relative">
            {isRecording && (
              <>
                {/* Outer pulse ring */}
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-red-500 opacity-0 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                {/* Middle pulse ring */}
                <div className="absolute inset-2 w-14 h-14 rounded-full bg-red-500 opacity-20"></div>
              </>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`relative w-16 h-16 rounded-full shadow-lg transition-all duration-200 font-semibold ${
                isRecording
                  ? 'bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700 animate-pulse'
                  : 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center`}
              title={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
            >
              <Mic className="h-8 w-8 mx-auto" />
            </button>
          </div>
        </div>
        
        {isRecording && (
          <div className="absolute -top-14 left-1/2 transform -translate-x-1/2">
            <div className="bg-red-600 dark:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Đang ghi âm...
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="absolute -top-36 left-1/2 transform -translate-x-1/2">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="relative">
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <button
                  onClick={clearCapturedImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md transition"
                  title="Xóa ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-300">
                Ảnh đã chụp
              </p>
            </div>
          </div>
        )}
      </div>

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
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full mx-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                 Chụp ảnh
               </h3>
               <button
                 onClick={stopCamera}
                 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
               >
                 <X className="h-6 w-6" />
               </button>
             </div>
             
             <div className="relative">
               <video
                 ref={videoRef}
                 autoPlay
                 playsInline
                 className="w-full h-64 bg-black rounded-lg object-cover"
               />
               
               <div className="flex justify-center mt-4 space-x-4">
                 <button
                   onClick={captureImage}
                   className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                 >
                   <Camera className="h-5 w-5 inline mr-2" />
                   Chụp ảnh
                 </button>
                 
                 <button
                   onClick={stopCamera}
                   className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
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
