'use client'

import React from 'react'
import { ToolAgentType, TOOL_AGENTS } from '@/lib/tool-agents'
import { Markdown } from '@/components/markdown'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'

interface ToolAgentResponseProps {
  toolAgent: ToolAgentType | null
  response: string | null
  loading?: boolean
  error?: string | null
  onClose?: () => void
}

export function ToolAgentResponse({
  toolAgent,
  response,
  loading = false,
  error = null,
  onClose
}: ToolAgentResponseProps) {
  if (!toolAgent && !loading && !error) return null

  const config = toolAgent ? TOOL_AGENTS[toolAgent] : null

  return (
    <div className="my-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config && (
            <>
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{config.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{config.description}</p>
              </div>
            </>
          )}
          {loading && <Loader className="animate-spin ml-2 text-blue-600" size={20} />}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {error && (
          <div className="flex gap-3 items-start bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">Error</p>
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader className="animate-spin mx-auto mb-2 text-blue-600" size={24} />
              <p className="text-slate-600 dark:text-slate-400">
                Đang xử lý với {config?.name || 'tool agent'}...
              </p>
            </div>
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-green-700 dark:text-green-400 mb-3">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span className="text-sm font-medium">Phản hồi từ {config?.name}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <Markdown content={response} />
            </div>
          </div>
        )}

        {!loading && !error && !response && (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p className="text-sm">Sẵn sàng để giúp bạn. Hãy đặt câu hỏi!</p>
          </div>
        )}
      </div>

      {/* Footer - Capabilities */}
      {config && !loading && !error && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-950">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Khả năng:</p>
          <div className="flex flex-wrap gap-2">
            {config.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
