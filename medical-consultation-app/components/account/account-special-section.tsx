"use client"

import { SectionCard } from "@/components/ui/section-card"

type AccountSpecialSectionProps = {
  offboard: () => Promise<void>
  loading: boolean
  sessionReady: boolean
  hasToken: boolean
}

export function AccountSpecialSection({ offboard, loading, sessionReady, hasToken }: AccountSpecialSectionProps) {
  return (
    <SectionCard
      title="Thông tin đặc thù"
      description="Thông tin gói dịch vụ và các thao tác xóa dữ liệu nhạy cảm của tài khoản."
      className="scroll-mt-28"
    >
      <section id="special" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Gói dịch vụ</label>
            <div className="rounded-lg border border-border/70 bg-background px-4 py-3 font-medium text-foreground">Free</div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Gia hạn tiếp theo</label>
            <div className="rounded-lg border border-border/70 bg-background px-4 py-3 text-foreground">Chưa thiết lập</div>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <label className="mb-3 block text-sm font-medium text-foreground">Clinical Offboarding</label>
          <p className="mb-3 text-sm text-muted-foreground">Xóa tất cả dữ liệu hội thoại lâm sàng và đăng xuất khỏi tài khoản</p>
          <button
            onClick={offboard}
            disabled={loading || !sessionReady || !hasToken}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {!sessionReady ? "Đang kiểm tra phiên..." : "Xóa và Offboarding"}
          </button>
        </div>
      </section>
    </SectionCard>
  )
}
