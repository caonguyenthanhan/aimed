"use client"

import { SectionCard } from "@/components/ui/section-card"
import type { AccountProfile } from "@/components/account/account-page-types"

type AccountSecuritySectionProps = {
  profile: AccountProfile
  maskedPhone: string
  editingSecurity: boolean
  setEditingSecurity: React.Dispatch<React.SetStateAction<boolean>>
  password: string
  setPassword: React.Dispatch<React.SetStateAction<string>>
  saveSecurity: () => Promise<void>
  loading: boolean
}

export function AccountSecuritySection({
  profile,
  maskedPhone,
  editingSecurity,
  setEditingSecurity,
  password,
  setPassword,
  saveSecurity,
  loading,
}: AccountSecuritySectionProps) {
  return (
    <SectionCard
      title="Bảo mật"
      description="Kiểm tra email, điện thoại và thao tác đổi mật khẩu của tài khoản."
      className="scroll-mt-28"
    >
      <section id="security" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 border-b border-border/70 pb-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
              <span className="text-sm text-foreground">{profile.email || "Chưa có"}</span>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  profile.email_verified
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {profile.email_verified ? "Đã xác thực" : "Chưa xác thực"}
              </span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Số điện thoại</label>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground">
              {maskedPhone || "Chưa có"}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setEditingSecurity((value) => !value)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {editingSecurity ? "Hủy" : "Đổi mật khẩu"}
          </button>
          {editingSecurity ? (
            <div className="flex flex-col gap-3 rounded-lg bg-background p-4 sm:flex-row">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="flex-1 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="Mật khẩu mới"
              />
              <button
                onClick={saveSecurity}
                disabled={loading}
                className="whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </SectionCard>
  )
}
