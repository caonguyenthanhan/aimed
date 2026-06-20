"use client"

import { SectionCard } from "@/components/ui/section-card"
import type { AccountProfile } from "@/components/account/account-page-types"

type AccountSettingsSectionProps = {
  profile: AccountProfile
  logoutAll: () => Promise<void>
  saveConsent: () => Promise<void>
  loading: boolean
  shareScores: boolean
  setShareScores: React.Dispatch<React.SetStateAction<boolean>>
  shareChatContent: boolean
  setShareChatContent: React.Dispatch<React.SetStateAction<boolean>>
  consentLoaded: boolean
  sessionReady: boolean
  hasToken: boolean
}

export function AccountSettingsSection({
  profile,
  logoutAll,
  saveConsent,
  loading,
  shareScores,
  setShareScores,
  shareChatContent,
  setShareChatContent,
  consentLoaded,
  sessionReady,
  hasToken,
}: AccountSettingsSectionProps) {
  return (
    <SectionCard
      title="Cài đặt tài khoản"
      description="Quản lý liên kết mạng xã hội, phiên đăng nhập và quyền chia sẻ dữ liệu."
      className="scroll-mt-28"
    >
      <section id="settings" className="space-y-6">
        <div className="border-b border-border/70 pb-6">
          <label className="mb-3 block text-sm font-medium text-foreground">Liên kết mạng xã hội</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className={`rounded-lg border px-4 py-3 ${
                profile.social_links?.google
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-border/70 bg-background"
              }`}
            >
              <div className="text-sm font-medium text-foreground">Google</div>
              <div
                className={`mt-1 text-xs ${
                  profile.social_links?.google ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                }`}
              >
                {profile.social_links?.google ? "✓ Đã liên kết" : "Chưa liên kết"}
              </div>
            </div>
            <div
              className={`rounded-lg border px-4 py-3 ${
                profile.social_links?.facebook
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-border/70 bg-background"
              }`}
            >
              <div className="text-sm font-medium text-foreground">Facebook</div>
              <div
                className={`mt-1 text-xs ${
                  profile.social_links?.facebook ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                }`}
              >
                {profile.social_links?.facebook ? "✓ Đã liên kết" : "Chưa liên kết"}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-border/70 pb-6">
          <label className="mb-3 block text-sm font-medium text-foreground">Phiên đăng nhập</label>
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg bg-background p-4 sm:flex-row sm:items-center">
            <span className="text-sm text-foreground">Đăng xuất khỏi tất cả thiết bị</span>
            <button
              onClick={logoutAll}
              disabled={loading}
              className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Đăng xuất tất cả"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-foreground">Trung tâm đồng ý (Consent)</label>
          <div className="mb-4 space-y-3 rounded-lg bg-background p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-foreground">Cho phép bác sĩ xem điểm số</span>
              <input
                type="checkbox"
                checked={shareScores}
                onChange={(event) => setShareScores(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-foreground">Cho phép bác sĩ xem nội dung chat</span>
              <input
                type="checkbox"
                checked={shareChatContent}
                onChange={(event) => setShareChatContent(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveConsent}
              disabled={loading || !sessionReady || !hasToken}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Đang lưu..." : !sessionReady ? "Đang kiểm tra phiên..." : "Lưu đồng ý"}
            </button>
            {!sessionReady ? (
              <span className="self-center text-xs text-muted-foreground">Đang kiểm tra phiên đăng nhập...</span>
            ) : !consentLoaded ? (
              <span className="self-center text-xs text-muted-foreground">Chưa tải được cấu hình từ server</span>
            ) : null}
          </div>
        </div>
      </section>
    </SectionCard>
  )
}
