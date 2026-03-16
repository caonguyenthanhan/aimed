"use client"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { ClientErrorBoundary } from "@/components/client-error-boundary"
const FriendChatInterface = dynamic(() => import("@/components/friend-chat-interface").then(m => m.FriendChatInterface), { ssr: false })
export default function TamSuPage() {
  const params = useSearchParams()
  const id = params.get('id') || undefined
  return (
    <div suppressHydrationWarning>
      <ClientErrorBoundary>
        <FriendChatInterface initialConversationId={id} />
      </ClientErrorBoundary>
    </div>
  )
}
