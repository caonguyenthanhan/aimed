'use client'

import React from 'react'
import { memo } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface OptimizedMessageProps {
  message: Message
  index: number
}

export const OptimizedMessage = memo(({ message, index }: OptimizedMessageProps) => {
  const formattedTime = message.timestamp?.toLocaleTimeString?.('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }) || ''

  return (
    <div className={`flex gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      {!message.isUser && (
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
          AI
        </div>
      )}

      <div
        className={`max-w-xs lg:max-w-md break-words rounded-lg px-4 py-2 text-sm ${
          message.isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
          {formattedTime}
        </p>
      </div>

      {message.isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-900 dark:text-slate-100 text-sm font-bold">
          👤
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if message content or user status changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isUser === nextProps.message.isUser
  )
})

OptimizedMessage.displayName = 'OptimizedMessage'
