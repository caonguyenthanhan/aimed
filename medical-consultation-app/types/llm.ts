export type LlmRole = "system" | "user" | "assistant"

export type LlmMessage = {
  role: LlmRole
  content: string
}

export type LlmMode = "cpu" | "gpu"

export type LlmTier = "flash" | "pro"

export type LlmChatMetadata = {
  context?: string
  mode?: LlmMode
  tier?: LlmTier
  fallback?: boolean
  provider?: string
  duration_ms?: number
  model_init?: boolean
  rag?: unknown
  timestamp?: string
}

export type LlmChatResponse = {
  response: string
  context?: string
  metadata?: LlmChatMetadata
  conversation_id?: string | null
  mode_used?: LlmMode
}

export type LlmChatRequest = {
  message: string
  model?: LlmTier
  conversationHistory?: LlmMessage[]
  conversation_id?: string | null
  user_id?: string | null
  provider?: "server" | "gemini"
  persona?: string
  systemPrompt?: string
  role?: string
  context?: string
}

