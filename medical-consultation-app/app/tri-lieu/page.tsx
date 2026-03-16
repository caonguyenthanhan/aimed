"use client"

import dynamic from "next/dynamic"

const DtxTriLieu = dynamic(() => import("@/components/dtx-tri-lieu").then(m => m.DtxTriLieu), { ssr: false })

export default function TriLieuPage() {
  return <div suppressHydrationWarning className="h-full overflow-y-auto"><DtxTriLieu /></div>
}

