import { NextRequest, NextResponse } from "next/server"
import { geminiTranscribe } from "@/lib/gemini-audio"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio_file') as File
    const context = formData.get('context') as string || 'health consultation'
    const conversationHistory = formData.get('conversation_history') as string
    const provider = formData.get('provider') as string
    const useOptimized = true

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    let userText = ""
    const geminiKey = String(process.env.GEMINI_API_KEY || "").trim()
    if (geminiKey) {
      const ab = await audioFile.arrayBuffer()
      const base64 = Buffer.from(ab).toString("base64")
      const mimeType = String((audioFile as any)?.type || "audio/webm")
      const model = (process.env.GEMINI_STT_MODEL && String(process.env.GEMINI_STT_MODEL).trim()) ? String(process.env.GEMINI_STT_MODEL).trim() : undefined
      const out = await geminiTranscribe({ apiKey: geminiKey, audioBase64: base64, mimeType, model })
      userText = String(out?.text || "").trim()
    } else {
      const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '')
      const sttForm = new FormData()
      sttForm.append('file', audioFile)
      const sttResp = await fetch(`${backendUrl}/v1/stt/stream`, { method: 'POST', body: sttForm })
      if (!sttResp.ok || !sttResp.body) return NextResponse.json({ success: false, error: 'stt_stream_failed' }, { status: 502 })
      const reader = sttResp.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split(/\n+/).filter(Boolean)
        for (const line of lines) {
          try {
            const obj = JSON.parse(line)
            if (obj?.text) userText += obj.text
            if (obj?.partial) userText += ''
          } catch {}
        }
      }
      userText = String(userText || '').trim()
    }
    userText = String(userText || '').replace(/[\*\_`#]+/g, '').replace(/\s+/g, ' ').trim()
    if (!userText) return NextResponse.json({ success: false, error: 'empty_transcript' }, { status: 400 })

    // Step 2: AI Chat
    let parsedHistory = []
    try {
      if (conversationHistory) {
        parsedHistory = JSON.parse(conversationHistory)
      }
    } catch (e) {
      console.warn('Failed to parse conversation history:', e)
    }

    const chatResponse = await fetch(`${request.nextUrl.origin}/api/llm-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userText,
        context: 'speech_stream',
        conversationHistory: parsedHistory,
        provider: (typeof provider === 'string' && (provider === 'gemini' || provider === 'server')) ? provider : undefined
      }),
    })

    if (!chatResponse.ok) {
      throw new Error('AI chat failed')
    }

    const chatData = await chatResponse.json()
    let aiResponse = chatData.response || 'Xin lỗi, tôi không thể trả lời câu hỏi này.'
    aiResponse = String(aiResponse || '').replace(/[\*\_`#]+/g, '').replace(/\s+/g, ' ').trim()

    const sosMeta = chatData?.metadata && typeof chatData.metadata === 'object' ? chatData.metadata : null
    if (sosMeta && (sosMeta as any)?.sos) {
      return NextResponse.json({
        success: true,
        user_text: userText,
        ai_response: aiResponse,
        audio_url: null,
        context: chatData.context,
        metadata: {
          ...(chatData?.metadata || {}),
          speech_to_text_success: true,
          ai_chat_success: true,
          text_to_speech_success: false,
          timestamp: new Date().toISOString()
        }
      })
    }

    const audioUrl = `/api/text-to-speech-stream?text=${encodeURIComponent(aiResponse)}&lang=vi`

    return NextResponse.json({
      success: true,
      user_text: userText,
      ai_response: aiResponse,
      audio_url: audioUrl,
      context: chatData.context,
      metadata: {
        speech_to_text_success: true,
        ai_chat_success: true,
        text_to_speech_success: true,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in speech-chat API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
