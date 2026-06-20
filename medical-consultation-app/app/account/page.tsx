"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ExternalLink, LockKeyhole, ShieldCheck, UserCircle2 } from "lucide-react"
import { AccountMessages } from "@/components/account/account-messages"
import { AccountProfileSection } from "@/components/account/account-profile-section"
import { AccountSectionNav } from "@/components/account/account-section-nav"
import { AccountSecuritySection } from "@/components/account/account-security-section"
import { AccountSettingsSection } from "@/components/account/account-settings-section"
import { AccountSpecialSection } from "@/components/account/account-special-section"
import { AccountSwitcherSection } from "@/components/account/account-switcher-section"
import { useAccountPageController } from "@/components/account/use-account-page-controller"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

export default function AccountPage() {
  const searchParams = useSearchParams()
  const account = useAccountPageController()

  return (
    <PortalShell
      eyebrow="Account Center"
      title="Hồ sơ tài khoản"
      description="Quản lý thông tin cá nhân, cài đặt bảo mật, consent và các thao tác offboarding. Trang đã được tách module để tiếp tục nâng UI mà không làm file chính phình thêm."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/account?tab=accounts#accounts"
            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Mở quản lý tài khoản
          </Link>
          <button
            onClick={account.logout}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <LockKeyhole className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Điều hướng nhanh" description="Các nhóm chức năng chính của workspace tài khoản.">
            <AccountSectionNav />
          </SectionCard>
          <SectionCard title="Lưu ý an toàn" description="Các thao tác nhạy cảm nên được kiểm tra trước khi thực hiện.">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Đổi mật khẩu và offboarding đều có thể kết thúc phiên hiện tại của người dùng.</p>
              <p>Consent chỉ được lưu khi có token hợp lệ và cấu hình backend cho phép.</p>
              <p>Avatar upload tiếp tục dùng worker cũ để nén ảnh trước khi gửi lên server.</p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Identity"
          value={account.profile.full_name || "Người dùng"}
          helper={account.joinInfo}
          icon={<UserCircle2 className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Security"
          value={account.profile.email_verified ? "Verified" : "Pending"}
          helper={account.maskedPhone || "Chưa có số điện thoại"}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="teal"
        />
        <StatCard
          label="Connections"
          value={`${account.socialLinkedCount}/2`}
          helper={account.consentLoaded ? "Consent đã tải" : "Consent chưa tải"}
          icon={<LockKeyhole className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <div className="space-y-6">
        <AccountMessages error={account.error} success={account.success} />

        {searchParams.get("tab") === "accounts" ? <AccountSwitcherSection /> : null}

        <AccountProfileSection
          profile={account.profile}
          setProfile={account.setProfile}
          editingProfile={account.editingProfile}
          setEditingProfile={account.setEditingProfile}
          saveProfile={account.saveProfile}
          loading={account.loading}
          avatarPreview={account.avatarPreview}
          avatarUploading={account.avatarUploading}
          avatarError={account.avatarError}
          joinInfo={account.joinInfo}
          onAvatarChange={account.onAvatarChange}
        />

        <AccountSecuritySection
          profile={account.profile}
          maskedPhone={account.maskedPhone}
          editingSecurity={account.editingSecurity}
          setEditingSecurity={account.setEditingSecurity}
          password={account.password}
          setPassword={account.setPassword}
          saveSecurity={account.saveSecurity}
          loading={account.loading}
        />

        <AccountSettingsSection
          profile={account.profile}
          logoutAll={account.logoutAll}
          saveConsent={account.saveConsent}
          loading={account.loading}
          shareScores={account.shareScores}
          setShareScores={account.setShareScores}
          shareChatContent={account.shareChatContent}
          setShareChatContent={account.setShareChatContent}
          consentLoaded={account.consentLoaded}
          sessionReady={account.sessionReady}
          hasToken={Boolean(account.token)}
        />

        <AccountSpecialSection
          offboard={account.offboard}
          loading={account.loading}
          sessionReady={account.sessionReady}
          hasToken={Boolean(account.token)}
        />
      </div>
    </PortalShell>
  )
}
