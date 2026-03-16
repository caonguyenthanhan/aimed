"use client"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { ClientErrorBoundary } from "@/components/client-error-boundary"
const FriendChatInterface = dynamic(() => import("@/components/friend-chat-interface").then(m => m.FriendChatInterface), { ssr: false })
export default function TamSuPage() {
  const [id, setId] = useState<string | undefined>(undefined)
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      setId(url.searchParams.get("id") || undefined)
    } catch {
      setId(undefined)
    }
  }, [])
  return (
    <div suppressHydrationWarning>
      <ClientErrorBoundary>
        <FriendChatInterface initialConversationId={id} />
      </ClientErrorBoundary>
    </div>
  )
}
