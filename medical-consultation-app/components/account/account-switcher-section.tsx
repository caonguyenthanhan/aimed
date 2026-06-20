"use client"

import dynamic from "next/dynamic"
import { SectionCard } from "@/components/ui/section-card"

const AccountSwitcher = dynamic(() => import("@/components/account-switcher"), { ssr: false })

export function AccountSwitcherSection() {
  return (
    <SectionCard
      title="Quản lý tài khoản"
      description="Chuyển đổi giữa các phiên đã lưu và thêm tài khoản mới trên cùng thiết bị."
      className="scroll-mt-28"
    >
      <section id="accounts">
        <AccountSwitcher />
      </section>
    </SectionCard>
  )
}
