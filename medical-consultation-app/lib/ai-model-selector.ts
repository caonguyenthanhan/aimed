import { generateText, streamText } from "ai"

export type AIModel = "grok" | "gemini-flash" | "gemini-pro" | "groq" | "claude"

interface ModelConfig {
  provider: string
  model: string
  maxRetries: number
  timeout: number
}

const MODEL_PRIORITY: Record<AIModel, ModelConfig> = {
  grok: {
    provider: "xai",
    model: "grok-beta",
    maxRetries: 2,
    timeout: 30000,
  },
  "gemini-flash": {
    provider: "google",
    model: "google/gemini-1.5-flash",
    maxRetries: 3,
    timeout: 30000,
  },
  "gemini-pro": {
    provider: "google",
    model: "google/gemini-1.5-pro",
    maxRetries: 2,
    timeout: 45000,
  },
  groq: {
    provider: "groq",
    model: "groq/mixtral-8x7b-32768",
    maxRetries: 2,
    timeout: 30000,
  },
  claude: {
    provider: "anthropic",
    model: "claude-3-5-sonnet",
    maxRetries: 2,
    timeout: 45000,
  },
}

// Track model health
const modelHealth: Record<AIModel, { errors: number; lastError?: Date; isHealthy: boolean }> = {
  grok: { errors: 0, isHealthy: true },
  "gemini-flash": { errors: 0, isHealthy: true },
  "gemini-pro": { errors: 0, isHealthy: true },
  groq: { errors: 0, isHealthy: true },
  claude: { errors: 0, isHealthy: true },
}

export function selectAIModel(userPreference?: AIModel): AIModel {
  if (userPreference && modelHealth[userPreference].isHealthy) {
    return userPreference
  }

  const priority: AIModel[] = ["grok", "gemini-flash", "groq", "gemini-pro", "claude"]

  for (const model of priority) {
    if (modelHealth[model].isHealthy) {
      return model
    }
  }

  resetModelHealth()
  return "gemini-pro"
}

export function recordModelError(model: AIModel, error: any): void {
  const health = modelHealth[model]
  health.errors++
  health.lastError = new Date()

  if (health.errors >= 3) {
    health.isHealthy = false
  }
}

export function recordModelSuccess(model: AIModel): void {
  const health = modelHealth[model]
  health.errors = 0
  health.isHealthy = true
}

export function resetModelHealth(): void {
  Object.values(modelHealth).forEach((h) => {
    h.errors = 0
    h.isHealthy = true
    h.lastError = undefined
  })
}

export function getModelConfig(model: AIModel): ModelConfig {
  return MODEL_PRIORITY[model]
}
