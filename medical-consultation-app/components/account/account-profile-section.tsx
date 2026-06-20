"use client"

import type { ChangeEvent } from "react"
import { SectionCard } from "@/components/ui/section-card"
import type { AccountProfile } from "@/components/account/account-page-types"
import { initial_from_name } from "@/components/account/account-page-types"

type AccountProfileSectionProps = {
  profile: AccountProfile
  setProfile: React.Dispatch<React.SetStateAction<AccountProfile>>
  editingProfile: boolean
  setEditingProfile: React.Dispatch<React.SetStateAction<boolean>>
  saveProfile: () => Promise<void>
  loading: boolean
  avatarPreview: string
  avatarUploading: boolean
  avatarError: string | null
  joinInfo: string
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function AccountProfileSection({
  profile,
  setProfile,
  editingProfile,
  setEditingProfile,
  saveProfile,
  loading,
  avatarPreview,
  avatarUploading,
  avatarError,
  joinInfo,
  onAvatarChange,
}: AccountProfileSectionProps) {
  return (
    <SectionCard
      title="Thông tin cá nhân"
      description="Quản lý hồ sơ hiển thị, ảnh đại diện và giới thiệu ngắn của tài khoản."
      className="scroll-mt-28"
    >
      <section id="profile" className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{initial_from_name(profile.full_name)}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="mb-2 text-sm text-muted-foreground">{joinInfo}</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditingProfile((value) => !value)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {editingProfile ? "Hủy" : "Chỉnh sửa"}
              </button>
              {editingProfile ? (
                <button
                  onClick={saveProfile}
                  disabled={loading}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Ảnh đại diện</label>
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {avatarUploading ? <div className="mt-1 text-xs text-muted-foreground">Đang xử lý ảnh...</div> : null}
            {avatarError ? <div className="mt-1 text-xs text-red-600 dark:text-red-400">{avatarError}</div> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Họ và tên</label>
            <input
              value={profile.full_name}
              onChange={(event) => setProfile((value) => ({ ...value, full_name: event.target.value }))}
              disabled={!editingProfile}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              placeholder="Họ và tên"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Tên hiển thị</label>
            <input
              value={profile.nickname || ""}
              onChange={(event) => setProfile((value) => ({ ...value, nickname: event.target.value }))}
              disabled={!editingProfile}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              placeholder="Biệt danh"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-foreground">Giới thiệu</label>
            <textarea
              value={profile.bio || ""}
              onChange={(event) => setProfile((value) => ({ ...value, bio: event.target.value }))}
              disabled={!editingProfile}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              rows={3}
              placeholder="Mô tả ngắn về bản thân"
            />
          </div>
        </div>
      </section>
    </SectionCard>
  )
}
