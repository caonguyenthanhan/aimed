"use client"

import dynamic from "next/dynamic"

const DtxReminders = dynamic(() => import("@/components/dtx-reminders").then(m => m.DtxReminders), { ssr: false })

export default function NhacNhoPage() {
  return <div suppressHydrationWarning className="h-full overflow-y-auto"><DtxReminders /></div>
}

