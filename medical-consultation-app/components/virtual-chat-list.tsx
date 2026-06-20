'use client'

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface VirtualChatListProps {
  messages: any[]
  renderMessage: (message: any, index: number) => React.ReactNode
  overscan?: number
  onLoadMore?: () => void
  contentClassName?: string
  conversationId?: string | null
}

export function VirtualChatList({
  messages,
  renderMessage,
  overscan = 5,
  onLoadMore,
  contentClassName,
  conversationId,
}: VirtualChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })
  const [isAtBottom, setIsAtBottom] = useState(true)
  const prevLenRef = useRef<number>(messages.length)

  // Helper to determine if a message is from the user
  const isUserMsg = (msg: any): boolean => {
    if (typeof msg.isUser === 'boolean') return msg.isUser
    return msg.role === 'user'
  }

  // Estimate height of each message dynamically based on content length
  const itemHeights = useMemo(() => {
    return messages.map(msg => {
      const content = msg.content || ''
      const charCount = content.length
      // Estimate lines. A typical line is around 65 characters.
      const lines = Math.ceil(charCount / 65)
      const textHeight = lines * 22
      if (isUserMsg(msg)) {
        return Math.max(60, textHeight + 32)
      } else {
        // Assistant messages have prose padding, GFM elements, and audio actions bar at bottom
        return Math.max(120, textHeight + 70)
      }
    })
  }, [messages])

  // Calculate cumulative offsets
  const { offsets, totalHeight } = useMemo(() => {
    const offsets = [0]
    for (let i = 1; i < itemHeights.length; i++) {
      offsets.push(offsets[i - 1] + itemHeights[i - 1])
    }
    const totalHeight = itemHeights.length > 0 
      ? offsets[offsets.length - 1] + itemHeights[itemHeights.length - 1]
      : 0
    return { offsets, totalHeight }
  }, [itemHeights])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsAtBottom(atBottom)

    if (messages.length === 0) return

    // Find starting index of visible range
    let start = 0
    while (start < messages.length - 1 && offsets[start] + itemHeights[start] < scrollTop) {
      start++
    }
    start = Math.max(0, start - overscan)

    // Find ending index of visible range
    let end = start
    while (end < messages.length && offsets[end] < scrollTop + clientHeight) {
      end++
    }
    end = Math.min(messages.length, end + overscan)

    setVisibleRange({ start, end })

    // Trigger load more when scrolling near top
    if (scrollTop < 100 && onLoadMore) {
      onLoadMore()
    }
  }, [offsets, itemHeights, overscan, messages.length, onLoadMore])

  // Scroll to bottom on mount or conversation change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const nextEl = scrollRef.current
      if (!nextEl) return
      nextEl.scrollTop = nextEl.scrollHeight
      setIsAtBottom(true)
    })
  }, [conversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const prevLen = prevLenRef.current
    const nextLen = messages.length
    prevLenRef.current = nextLen
    if (!isAtBottom) return
    if (nextLen <= prevLen) return
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const nextEl = scrollRef.current
      if (!nextEl) return
      nextEl.scrollTop = nextEl.scrollHeight
    })
  }, [messages.length, isAtBottom])

  const visibleMessages = useMemo(
    () => messages.slice(visibleRange.start, visibleRange.end),
    [messages, visibleRange]
  )

  const offsetY = offsets[visibleRange.start] || 0

  return (
    <ScrollArea ref={scrollRef} className="flex-1 min-h-0" viewportClassName="overflow-y-auto" onScroll={handleScroll}>
      <div ref={containerRef} className="relative" style={{ height: totalHeight }}>
        <div
          className={cn("space-y-2 px-4", contentClassName)}
          style={{
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleMessages.map((msg, idx) => (
            <div key={msg.id || (visibleRange.start + idx)} className="min-h-fit">
              {renderMessage(msg, visibleRange.start + idx)}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
