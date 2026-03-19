"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { saveCurrentSession } from "@/lib/account-manager"

const AccountSwitcher = dynamic(() => import("@/components/account-switcher"), { ssr: false })

type Profile = {
  full_name: string
  nickname?: string
  bio?: string
  email?: string
  email_verified?: boolean
  phone?: string
  joined_at?: string
  avatar_url?: string
  social_links?: { google?: boolean; facebook?: boolean }
}

function maskPhone(p?: string) {
  if (!p) return ""
  const s = p.replace(/\D/g, "")
  if (s.length < 4) return p
  const head = s.slice(0, 3)
  const tail = s.slice(-3)
  return `${head}***${tail}`
}

function initialFromName(name: string) {
  const t = String(name || "").trim()
  if (!t) return ""
  const parts = t.split(/\s+/).filter(Boolean)
  return parts[parts.length - 1]?.[0]?.toUpperCase() || t[0]?.toUpperCase() || ""
}

export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile>({ full_name: "" })
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingSecurity, setEditingSecurity] = useState(false)
  const [password, setPassword] = useState("")
  const [shareScores, setShareScores] = useState(false)
  const [shareChatContent, setShareChatContent] = useState(false)
  const [consentLoaded, setConsentLoaded] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [avatarUrlObject, setAvatarUrlObject] = useState<string>("")
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("authToken") : null), [])

  useEffect(() => {
    // Save current session when account page loads
    saveCurrentSession()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        let data: any = null
        if (token) {
          const resp = await fetch("/api/backend/v1/user", { headers: { Authorization: `Bearer ${token}` } })
          if (resp.ok) data = await resp.json()
        }
        if (!data && typeof window !== "undefined") {
          const raw = localStorage.getItem("profile")
          if (raw) data = JSON.parse(raw)
        }
        const name = String(data?.full_name || data?.username || localStorage.getItem("userFullName") || localStorage.getItem("username") || "").trim()
        const email = String(data?.email || "").trim()
        const phone = String(data?.phone || "").trim()
        const joined = String(data?.joined_at || "").trim()
        const nickname = String(data?.nickname || "").trim()
        const bio = String(data?.bio || "").trim()
        const avatar = String(data?.avatar_url || "").trim()
        const links = { google: !!data?.social_links?.google, facebook: !!data?.social_links?.facebook }
        setProfile({
          full_name: name || "Người dùng",
          email,
          email_verified: !!data?.email_verified,
          phone,
          joined_at: joined,
          nickname,
          bio,
          avatar_url: avatar,
          social_links: links,
        })
        if (!avatar) setAvatarPreview("")
        else setAvatarPreview(avatar)
        if (token) {
          try {
            const r = await fetch("/api/backend/v1/consent", { headers: { Authorization: `Bearer ${token}` } })
            if (r.ok) {
              const c = await r.json()
              setShareScores(!!c?.share_scores)
              setShareChatContent(!!c?.share_chat_content)
              setConsentLoaded(true)
            }
          } catch {}
        }
      } catch {}
    }
    load()
  }, [token])

  useEffect(() => {
    return () => {
      try {
        if (avatarUrlObject) URL.revokeObjectURL(avatarUrlObject)
      } catch {}
    }
  }, [avatarUrlObject])

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setAvatarError(null)
      setAvatarUploading(true)
      const f = e.target.files?.[0] || null
      if (!f) {
        setAvatarUploading(false)
        return
      }
      const MAX = 5 * 1024 * 1024
      if (f.size > MAX) {
        setAvatarError("Ảnh quá lớn (tối đa 5MB). Vui lòng chọn ảnh nhỏ hơn.")
        setAvatarUploading(false)
        return
      }
      const worker = new Worker(new URL('./avatar-worker.ts', import.meta.url))
      worker.onmessage = (evt: MessageEvent) => {
        const data: any = evt.data
        if (!data || !data.ok || !data.blob) {
          setAvatarError("Không thể xử lý ảnh. Vui lòng thử lại.")
          setAvatarUploading(false)
          worker.terminate()
          return
        }
        const blob: Blob = data.blob as Blob
        const url = URL.createObjectURL(blob)
        if (avatarUrlObject) {
          try { URL.revokeObjectURL(avatarUrlObject) } catch {}
        }
        const compressedFile = new File([blob], f.name.replace(/\.(png|jpg|jpeg|webp)$/i, '') + '.jpg', { type: 'image/jpeg' })
        setAvatarUrlObject(url)
        setAvatarFile(compressedFile)
        setAvatarPreview(url)
        setAvatarUploading(false)
        worker.terminate()
      }
      worker.onerror = () => {
        setAvatarError("Không thể xử lý ảnh. Vui lòng thử lại.")
        setAvatarUploading(false)
        worker.terminate()
      }
      worker.postMessage(f)
    } catch {
      setAvatarError("Không thể xử lý ảnh. Vui lòng thử lại.")
      setAvatarUploading(false)
    }
  }

  const saveProfile = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      let resp: Response
      if (avatarFile) {
        const fd = new FormData()
        fd.append("full_name", profile.full_name || "")
        if (profile.nickname) fd.append("nickname", profile.nickname)
        if (profile.bio) fd.append("bio", profile.bio)
        fd.append("avatar", avatarFile)
        resp = await fetch("/api/backend/v1/user", {
          method: "PUT",
          headers: token ? { "Authorization": `Bearer ${token}` } : undefined,
          body: fd,
        })
      } else {
        const body: any = { full_name: profile.full_name, nickname: profile.nickname, bio: profile.bio }
        resp = await fetch("/api/backend/v1/user", {
          method: "PUT",
          headers: token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } : { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      if (!resp.ok) {
        const t = await resp.text()
        setError(t || "Cập nhật thất bại")
        setLoading(false)
        return
      }
      setSuccess("Đã lưu thông tin hồ sơ")
      setEditingProfile(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("userFullName", profile.full_name || "")
        localStorage.setItem("profile", JSON.stringify(profile))
      }
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi cập nhật")
    } finally {
      setLoading(false)
    }
  }

  const saveSecurity = async () => {
    if (!password.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const resp = await fetch("/api/backend/v1/user/password", {
        method: "PUT",
        headers: token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } : { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        setError(t || "Đổi mật khẩu thất bại")
        setLoading(false)
        return
      }
      setSuccess("Đã đổi mật khẩu. Vui lòng đăng nhập lại.")
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken")
          localStorage.removeItem("userId")
        }
      } catch {}
      setTimeout(() => router.replace("/login"), 800)
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi đổi mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  const logoutAll = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const resp = await fetch("/api/backend/v1/user/sessions/logout-all", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : undefined,
      })
      if (!resp.ok) {
        setSuccess("Đã đăng xuất cục bộ trên thiết bị này")
      } else {
        setSuccess("Đã đăng xuất khỏi tất cả thiết bị")
      }
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken")
          localStorage.removeItem("userId")
        }
      } catch {}
      setTimeout(() => router.replace("/login"), 800)
    } catch {
      setSuccess("Đã đăng xuất cục bộ trên thiết bị này")
      setTimeout(() => router.replace("/login"), 800)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken")
        localStorage.removeItem("userId")
      }
    } catch {}
    router.replace("/login")
  }

  const saveConsent = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const resp = await fetch("/api/backend/v1/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ share_scores: shareScores, share_chat_content: shareChatContent }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        setError(t || "Lưu đồng ý thất bại")
        setLoading(false)
        return
      }
      setSuccess("Đã lưu cài đặt quyền riêng tư")
      setConsentLoaded(true)
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi lưu cài đặt")
    } finally {
      setLoading(false)
    }
  }

  const offboard = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const resp = await fetch("/api/backend/v1/offboarding", { method: "POST", headers: { "Authorization": `Bearer ${token}` } })
      if (!resp.ok) {
        const t = await resp.text()
        setError(t || "Offboarding thất bại")
        setLoading(false)
        return
      }
      try {
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage)
          for (const k of keys) {
            if (k.startsWith("conv_messages_") || k.startsWith("conv_title_") || k.startsWith("friend_conv_messages_") || k.startsWith("friend_conv_title_")) {
              localStorage.removeItem(k)
            }
          }
          localStorage.removeItem("authToken")
          localStorage.removeItem("userId")
        }
      } catch {}
      setSuccess("Đã offboarding và xóa dữ liệu hội thoại")
      setTimeout(() => router.replace("/login"), 800)
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi offboarding")
    } finally {
      setLoading(false)
    }
  }

  const joinInfo = useMemo(() => {
    if (!profile.joined_at) return "Thành viên từ tháng 12/2025"
    try {
      const d = new Date(profile.joined_at)
      const month = d.toLocaleString("vi-VN", { month: "long" })
      return `Thành viên từ ${month}/${d.getFullYear()}`
    } catch {
      return `Thành viên từ ${profile.joined_at}`
    }
  }, [profile.joined_at])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">Hồ sơ tài khoản</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Quản lý thông tin cá nhân và cài đặt bảo mật</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <div className="sticky top-24 space-y-2">
            <a href="#profile" className="block px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition">Thông tin chung</a>
            <a href="#accounts" className="block px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition">Quản lý tài khoản</a>
            <a href="#security" className="block px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition">Bảo mật</a>
            <a href="#settings" className="block px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition">Cài đặt</a>
            <a href="#special" className="block px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition">Thông tin đặc thù</a>
          </div>
        </aside>
        <main className="lg:col-span-4 order-1 lg:order-2 space-y-6">
          {error && <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>}
          {success && <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>}
          
          {/* Account Switcher Section */}
          {searchParams.get('tab') === 'accounts' && (
            <section id="accounts" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <AccountSwitcher />
            </section>
          )}
          
          <section id="profile" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Thông tin cá nhân</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="h-20 w-20 rounded-full bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                {avatarPreview ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-2xl font-bold">{initialFromName(profile.full_name)}</span>}
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{joinInfo}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditingProfile(v => !v)} className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition">{editingProfile ? "Hủy" : "Chỉnh sửa"}</button>
                  {editingProfile && (
                    <button onClick={saveProfile} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">{loading ? "Đang lưu..." : "Lưu thay đổi"}</button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Ảnh đại diện</label>
                <input type="file" accept="image/*" onChange={onAvatarChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {avatarUploading && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đang xử lý ảnh...</div>}
                {avatarError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{avatarError}</div>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Họ và tên</label>
                <input value={profile.full_name} onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))} disabled={!editingProfile} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" placeholder="Họ và tên" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Tên hiển thị</label>
                <input value={profile.nickname || ""} onChange={(e) => setProfile(p => ({ ...p, nickname: e.target.value }))} disabled={!editingProfile} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" placeholder="Biệt danh" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Giới thiệu</label>
                <textarea value={profile.bio || ""} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} disabled={!editingProfile} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" rows={3} placeholder="Mô tả ngắn về bản thân" />
              </div>
            </div>
          </section>
          <section id="security" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Bảo mật</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Email</label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <span className="text-sm text-slate-900 dark:text-slate-50">{profile.email || "Chưa có"}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${profile.email_verified ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>{profile.email_verified ? "Đã xác thực" : "Chưa xác thực"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Số điện thoại</label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm">{maskPhone(profile.phone) || "Chưa có"}</div>
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={() => setEditingSecurity(v => !v)} className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition">{editingSecurity ? "Hủy" : "Đổi mật khẩu"}</button>
              {editingSecurity && (
                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Mật khẩu mới" />
                  <button onClick={saveSecurity} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition whitespace-nowrap">{loading ? "Đang lưu..." : "Xác nhận"}</button>
                </div>
              )}
            </div>
          </section>
          <section id="settings" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Cài đặt tài khoản</h2>
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-200 dark:border-slate-700">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Liên kết mạng xã hội</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`rounded-lg border px-4 py-3 ${profile.social_links?.google ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Google</div>
                    <div className={`text-xs mt-1 ${profile.social_links?.google ? "text-green-700 dark:text-green-300" : "text-slate-600 dark:text-slate-400"}`}>{profile.social_links?.google ? "✓ Đã liên kết" : "Chưa liên kết"}</div>
                  </div>
                  <div className={`rounded-lg border px-4 py-3 ${profile.social_links?.facebook ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Facebook</div>
                    <div className={`text-xs mt-1 ${profile.social_links?.facebook ? "text-green-700 dark:text-green-300" : "text-slate-600 dark:text-slate-400"}`}>{profile.social_links?.facebook ? "✓ Đã liên kết" : "Chưa liên kết"}</div>
                  </div>
                </div>
              </div>
              <div className="pb-6 border-b border-slate-200 dark:border-slate-700">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Phiên đăng nhập</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Đăng xuất khỏi tất cả thiết bị</span>
                  <button onClick={logoutAll} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition whitespace-nowrap">{loading ? "Đang xử lý..." : "Đăng xuất tất cả"}</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Trung tâm đồng ý (Consent)</label>
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Cho phép bác sĩ xem điểm số</span>
                    <input type="checkbox" checked={shareScores} onChange={(e) => setShareScores(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Cho phép bác sĩ xem nội dung chat</span>
                    <input type="checkbox" checked={shareChatContent} onChange={(e) => setShareChatContent(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveConsent} disabled={loading || !token} className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 transition">{loading ? "Đang lưu..." : "Lưu đồng ý"}</button>
                  {!consentLoaded && <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Chưa tải được cấu hình từ server</span>}
                </div>
              </div>
            </div>
          </section>
          <section id="special" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Thông tin đặc thù</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Gói dịch vụ</label>
                <div className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-medium">Free</div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Gia hạn tiếp theo</label>
                <div className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50">Chưa thiết lập</div>
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Clinical Offboarding</label>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Xóa tất cả dữ liệu hội thoại lâm sàng và đăng xuất khỏi tài khoản</p>
              <button onClick={offboard} disabled={loading || !token} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition">Xóa và Offboarding</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
