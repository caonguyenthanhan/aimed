"use client"

import { useState } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Textarea } from "./ui/textarea"
import { LlmChatResponseSchema } from "@/lib/llm-schema"
import type { LlmMessage } from "@/types/llm"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface AiChatBoxProps {
  placeholder?: string
  initialMessage?: string
  context?: string // Additional context for the AI (e.g., "psychological support", "health lookup")
}

export function AiChatBox({
  placeholder = "Nhập câu hỏi của bạn...",
  initialMessage = "Xin chào! Tôi có thể giúp gì cho bạn?",
  context = "",
}: AiChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: initialMessage,
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content,
      })) as LlmMessage[]

      const chatMessages = [
        ...(context ? [{ role: 'system', content: context }] : []),
        ...conversationHistory,
        { role: 'user', content: userMessage.content },
      ]

      const response = await fetch("/api/llm-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "flash",
          message: userMessage.content,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const raw = await response.json()
      const parsed = LlmChatResponseSchema.safeParse(raw)
      const data = parsed.success ? parsed.data : raw
      const aiResponse = (data as any)?.response || ""
      const md = (data as any)?.metadata
      if (md && typeof window !== 'undefined') {
        try {
          const detail = { target: md.mode === 'gpu' ? 'gpu' : 'cpu' }
          window.dispatchEvent(new CustomEvent('runtime_mode_changed', { detail }))
        } catch {}
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error getting AI response:", error)

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc tham khảo ý kiến bác sĩ chuyên khoa.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-80 border rounded-lg bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.isUser ? "justify-end" : "justify-start"}`}>
            {!message.isUser && (
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <Card className={`max-w-[80%] ${message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <CardContent className="p-2">
                {message.isUser ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="text-sm font-bold prose prose-sm dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                <p
                  suppressHydrationWarning
                  className={`text-xs mt-1 opacity-70 ${message.isUser ? "text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {message.timestamp.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
            {message.isUser && (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <Card className="bg-muted">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-sm text-muted-foreground">Đang suy nghĩ...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder || "Nhập tin nhắn..."}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button onClick={handleSendMessage} size="icon" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
