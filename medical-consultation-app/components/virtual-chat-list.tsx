'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface VirtualChatListProps {
  messages: Message[]
  renderMessage: (message: Message, index: number) => React.ReactNode
  itemHeight?: number
  overscan?: number
  onLoadMore?: () => void
}

export function VirtualChatList({
  messages,
  renderMessage,
  itemHeight = 80,
  overscan = 5,
  onLoadMore,
}: VirtualChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 10 })
  const [isAtBottom, setIsAtBottom] = React.useState(true)

  const totalHeight = useMemo(() => messages.length * itemHeight, [messages.length, itemHeight])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 50

    setIsAtBottom(atBottom)

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(messages.length, Math.ceil((scrollTop + clientHeight) / itemHeight) + overscan)

    setVisibleRange({ start, end })

    // Trigger load more when scrolling near top
    if (scrollTop < 100 && onLoadMore) {
      onLoadMore()
    }
  }, [itemHeight, overscan, messages.length, onLoadMore])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 0)
    }
  }, [messages.length, isAtBottom])

  const visibleMessages = useMemo(
    () => messages.slice(visibleRange.start, visibleRange.end),
    [messages, visibleRange]
  )

  const offsetY = visibleRange.start * itemHeight

  return (
    <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
      <div ref={containerRef} className="relative" style={{ height: totalHeight }}>
        <div
          className="space-y-2 px-4"
          style={{
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleMessages.map((msg, idx) => (
            <div key={msg.id || idx} className="min-h-fit">
              {renderMessage(msg, visibleRange.start + idx)}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
