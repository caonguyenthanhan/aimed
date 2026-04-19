'use client'
import { useSearchParams } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { Suspense } from "react"

function TuVanContent() {
  const params = useSearchParams()
  const id = params.get('id') || undefined
  return <ChatInterface initialConversationId={id} />
}

export default function TuVanPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <TuVanContent />
    </Suspense>
  )
}
