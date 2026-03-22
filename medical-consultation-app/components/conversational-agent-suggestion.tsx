"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, ChevronRight, MessageSquare, X } from "lucide-react"
import type { Agent } from "@/lib/agent-registry"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface ConversationalAgentSuggestion {
  agent: Agent
  // Initial clarifying questions to ask user
  clarifyingQuestions: string[]
  // Available options for user to choose from
  suggestedActions: Array<{
    id: string
    label: string
    description: string
  }>
  // Why this agent might be helpful (shown after interaction)
  reason?: string
}

interface ConversationalAgentSuggestionProps {
  suggestion: ConversationalAgentSuggestion
  suggestionId: string
  onDismiss?: () => void
  onSelected?: (actionId: string, userResponses?: Record<string, string>) => void
}

/**
 * Conversational Agent Suggestion Component
 * Hỏi người dùng trước bằng các câu hỏi tự nhiên thay vì ép đổi trang
 * Người dùng có thể trả lời để chọn hành động phù hợp
 */
export function ConversationalAgentSuggestion({
  suggestion,
  suggestionId,
  onDismiss,
  onSelected,
}: ConversationalAgentSuggestionProps) {
  const router = useRouter()
  const { agent, clarifyingQuestions, suggestedActions, reason } = suggestion
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userResponses, setUserResponses] = useState<Record<string, string>>({})
  const [showActions, setShowActions] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  // If no questions, show actions directly
  useEffect(() => {
    if (clarifyingQuestions.length === 0) {
      setShowActions(true)
    }
  }, [clarifyingQuestions])

  const handleQuestionResponse = (response: string) => {
    const question = clarifyingQuestions[currentQuestionIndex]
    setUserResponses((prev) => ({
      ...prev,
      [question]: response,
    }))

    // Move to next question
    if (currentQuestionIndex < clarifyingQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      // All questions answered, show actions
      setShowActions(true)
    }
  }

  const handleActionSelect = (actionId: string) => {
    setSelectedAction(actionId)
    onSelected?.(actionId, userResponses)

    const action = suggestedActions.find((a) => a.id === actionId)
    if (action) {
      if (action.id === "embed") {
        // Parent component handles embedding
        return
      } else if (action.id === "open-tab") {
        window.open(agent.route, "_blank")
      } else if (action.id === "navigate") {
        router.push(agent.route)
      }
    }
  }

  if (!showActions) {
    // Show clarifying questions
    const question = clarifyingQuestions[currentQuestionIndex]
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 animate-in slide-in-from-top fade-in duration-300">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    {agent.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {question}
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleQuestionResponse("yes")}
                    variant="default"
                    size="sm"
                    className="flex-1"
                  >
                    Có
                  </Button>
                  <Button
                    onClick={() => handleQuestionResponse("no")}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Không
                  </Button>
                </div>

                {/* Progress indicator */}
                <div className="mt-3 flex gap-1">
                  {clarifyingQuestions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        idx <= currentQuestionIndex
                          ? "bg-amber-600 dark:bg-amber-400"
                          : "bg-amber-200 dark:bg-amber-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show action options after questions answered
  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 animate-in slide-in-from-top fade-in duration-300">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ChevronRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                  {agent.name}
                </h3>
              </div>

              {reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="font-semibold">Tại sao:</span> {reason}
                </p>
              )}

              <div className="space-y-2">
                {suggestedActions.map((action) => (
                  <Button
                    key={action.id}
                    onClick={() => handleActionSelect(action.id)}
                    variant={
                      selectedAction === action.id ? "default" : "outline"
                    }
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    disabled={selectedAction !== null && selectedAction !== action.id}
                  >
                    <div className="flex items-start gap-3 w-full">
                      {action.id === "embed" && (
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      {action.id === "open-tab" && (
                        <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      {action.id !== "embed" && action.id !== "open-tab" && (
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{action.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
