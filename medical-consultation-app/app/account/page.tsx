"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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
          full_name: name,
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Hồ sơ</h1>
      <p className="text-slate-600 mt-1">Quản lý thông tin và cài đặt tài khoản</p>
      <div className="mt-6 grid md:grid-cols-4 gap-6">
        <aside className="md:col-span-1 space-y-2">
          <a href="#profile" className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Thông tin chung</a>
          <a href="#security" className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Bảo mật</a>
          <a href="#settings" className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Cài đặt</a>
          <a href="#special" className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Thông tin đặc thù</a>
        </aside>
        <main className="md:col-span-3 space-y-6">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <section id="profile" className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center overflow-hidden">
                {avatarPreview ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-xl font-bold">{initialFromName(profile.full_name)}</span>}
              </div>
              <div className="space-y-1">
                <div className="text-sm text-slate-500">{joinInfo}</div>
                <button onClick={() => setEditingProfile(v => !v)} className="px-3 py-1.5 rounded-md bg-slate-800 text-white text-sm">{editingProfile ? "Lưu" : "Chỉnh sửa"}</button>
                {editingProfile && (
                  <button onClick={saveProfile} disabled={loading} className="ml-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{loading ? "Đang lưu..." : "Xác nhận lưu"}</button>
                )}
              </div>
            </div>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">Ảnh đại diện</label>
                <input type="file" accept="image/*" onChange={onAvatarChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
                {avatarUploading && <div className="text-xs text-slate-500 mt-1">Đang xử lý ảnh...</div>}
                {avatarError && <div className="text-xs text-red-600 mt-1">{avatarError}</div>}
              </div>
              <div>
                <label className="text-sm text-slate-700">Họ và tên</label>
                <input value={profile.full_name} onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))} disabled={!editingProfile} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100" placeholder="Họ và tên" />
              </div>
              <div>
                <label className="text-sm text-slate-700">Tên hiển thị</label>
                <input value={profile.nickname || ""} onChange={(e) => setProfile(p => ({ ...p, nickname: e.target.value }))} disabled={!editingProfile} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100" placeholder="Biệt danh" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">Giới thiệu</label>
                <textarea value={profile.bio || ""} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} disabled={!editingProfile} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100" rows={3} placeholder="Mô tả ngắn" />
              </div>
            </div>
          </section>
          <section id="security" className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">Email</label>
                <div className="mt-1 flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-slate-700">{profile.email || "Chưa có"}</span>
                  <span className={`text-xs ${profile.email_verified ? "text-green-600" : "text-yellow-600"}`}>{profile.email_verified ? "Đã xác thực" : "Chưa xác thực"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-700">Số điện thoại</label>
                <div className="mt-1 rounded-xl border px-3 py-2 text-slate-700">{maskPhone(profile.phone) || "Chưa có"}</div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <button onClick={() => setEditingSecurity(v => !v)} className="px-3 py-1.5 rounded-md bg-slate-800 text-white text-sm">{editingSecurity ? "Đóng" : "Đổi mật khẩu"}</button>
                {editingSecurity && (
                  <div className="flex-1 flex items-center gap-2">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300" placeholder="Mật khẩu mới" />
                    <button onClick={saveSecurity} disabled={loading} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{loading ? "Đang lưu..." : "Lưu"}</button>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section id="settings" className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">Liên kết mạng xã hội</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className={`rounded-xl border px-3 py-2 ${profile.social_links?.google ? "border-green-300 bg-green-50" : "border-gray-200"}`}>Google {profile.social_links?.google ? "đã liên kết" : "chưa liên kết"}</div>
                  <div className={`rounded-xl border px-3 py-2 ${profile.social_links?.facebook ? "border-green-300 bg-green-50" : "border-gray-200"}`}>Facebook {profile.social_links?.facebook ? "đã liên kết" : "chưa liên kết"}</div>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-700">Quản lý phiên đăng nhập</label>
                <div className="mt-1 flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-slate-700">Thiết bị đang đăng nhập</span>
                  <button onClick={logoutAll} disabled={loading} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm disabled:opacity-50">Đăng xuất tất cả</button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button onClick={logout} className="px-3 py-2 rounded-md bg-slate-800 text-white text-sm">Đăng xuất</button>
            </div>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">Trung tâm đồng ý (Consent)</label>
                <div className="mt-2 space-y-2 rounded-xl border p-4">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">Cho phép bác sĩ xem điểm số</span>
                    <input type="checkbox" checked={shareScores} onChange={(e) => setShareScores(e.target.checked)} className="h-4 w-4" />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">Cho phép bác sĩ xem nội dung chat</span>
                    <input type="checkbox" checked={shareChatContent} onChange={(e) => setShareChatContent(e.target.checked)} className="h-4 w-4" />
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={saveConsent} disabled={loading || !token} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{loading ? "Đang lưu..." : "Lưu đồng ý"}</button>
                    {!consentLoaded && <span className="text-xs text-slate-500">Chưa tải được cấu hình từ server</span>}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">Clinical Offboarding</label>
                <div className="mt-2 flex items-center justify-between rounded-xl border p-4">
                  <span className="text-sm text-slate-700">Xóa sạch dấu vết hội thoại lâm sàng của tài khoản</span>
                  <button onClick={offboard} disabled={loading || !token} className="px-3 py-2 rounded-md bg-red-600 text-white text-sm disabled:opacity-50">Offboarding</button>
                </div>
              </div>
            </div>
          </section>
          <section id="special" className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">Gói dịch vụ</label>
                <div className="mt-1 rounded-xl border px-3 py-2 text-slate-700">Free</div>
              </div>
              <div>
                <label className="text-sm text-slate-700">Ngày gia hạn tiếp theo</label>
                <div className="mt-1 rounded-xl border px-3 py-2 text-slate-700">Chưa thiết lập</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
