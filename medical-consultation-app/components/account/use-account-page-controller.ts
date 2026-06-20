"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { saveCurrentSession } from "@/lib/account-manager"
import { get_join_info, mask_phone, type AccountProfile } from "@/components/account/account-page-types"

export function useAccountPageController() {
  const router = useRouter()
  const [profile, setProfile] = useState<AccountProfile>({ full_name: "" })
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
  const [token, setToken] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    try {
      setToken(typeof window !== "undefined" ? localStorage.getItem("authToken") : null)
    } catch {
      setToken(null)
    } finally {
      setSessionReady(true)
    }
    saveCurrentSession()
  }, [])

  useEffect(() => {
    if (!sessionReady) return

    const load = async () => {
      try {
        let data: any = null
        if (token) {
          const response = await fetch("/api/backend/v1/user", { headers: { Authorization: `Bearer ${token}` } })
          if (response.ok) data = await response.json()
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
        setAvatarPreview(avatar || "")
        if (token) {
          try {
            const consentResponse = await fetch("/api/backend/v1/consent", { headers: { Authorization: `Bearer ${token}` } })
            if (consentResponse.ok) {
              const consent = await consentResponse.json()
              setShareScores(!!consent?.share_scores)
              setShareChatContent(!!consent?.share_chat_content)
              setConsentLoaded(true)
            }
          } catch {}
        }
      } catch {}
    }
    load()
  }, [sessionReady, token])

  useEffect(() => {
    return () => {
      try {
        if (avatarUrlObject) URL.revokeObjectURL(avatarUrlObject)
      } catch {}
    }
  }, [avatarUrlObject])

  const onAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setAvatarError(null)
      setAvatarUploading(true)
      const file = event.target.files?.[0] || null
      if (!file) {
        setAvatarUploading(false)
        return
      }
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setAvatarError("Ảnh quá lớn (tối đa 5MB). Vui lòng chọn ảnh nhỏ hơn.")
        setAvatarUploading(false)
        return
      }
      const worker = new Worker(new URL("../../app/account/avatar-worker.ts", import.meta.url))
      worker.onmessage = (workerEvent: MessageEvent) => {
        const data: any = workerEvent.data
        if (!data || !data.ok || !data.blob) {
          setAvatarError("Không thể xử lý ảnh. Vui lòng thử lại.")
          setAvatarUploading(false)
          worker.terminate()
          return
        }
        const blob: Blob = data.blob as Blob
        const url = URL.createObjectURL(blob)
        if (avatarUrlObject) {
          try {
            URL.revokeObjectURL(avatarUrlObject)
          } catch {}
        }
        const compressedFile = new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp)$/i, "") + ".jpg", { type: "image/jpeg" })
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
      worker.postMessage(file)
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
      let response: Response
      if (avatarFile) {
        const formData = new FormData()
        formData.append("full_name", profile.full_name || "")
        if (profile.nickname) formData.append("nickname", profile.nickname)
        if (profile.bio) formData.append("bio", profile.bio)
        formData.append("avatar", avatarFile)
        response = await fetch("/api/backend/v1/user", {
          method: "PUT",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        })
      } else {
        response = await fetch("/api/backend/v1/user", {
          method: "PUT",
          headers: token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: profile.full_name, nickname: profile.nickname, bio: profile.bio }),
        })
      }
      if (!response.ok) {
        const text = await response.text()
        setError(text || "Cập nhật thất bại")
        setLoading(false)
        return
      }
      setSuccess("Đã lưu thông tin hồ sơ")
      setEditingProfile(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("userFullName", profile.full_name || "")
        localStorage.setItem("profile", JSON.stringify(profile))
      }
    } catch (reason: any) {
      setError(reason?.message || "Có lỗi xảy ra khi cập nhật")
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
      const response = await fetch("/api/backend/v1/user/password", {
        method: "PUT",
        headers: token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const text = await response.text()
        setError(text || "Đổi mật khẩu thất bại")
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
    } catch (reason: any) {
      setError(reason?.message || "Có lỗi xảy ra khi đổi mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  const logoutAll = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/backend/v1/user/sessions/logout-all", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) {
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
      const response = await fetch("/api/backend/v1/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ share_scores: shareScores, share_chat_content: shareChatContent }),
      })
      if (!response.ok) {
        const text = await response.text()
        setError(text || "Lưu đồng ý thất bại")
        setLoading(false)
        return
      }
      setSuccess("Đã lưu cài đặt quyền riêng tư")
      setConsentLoaded(true)
    } catch (reason: any) {
      setError(reason?.message || "Có lỗi xảy ra khi lưu cài đặt")
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
      const response = await fetch("/api/backend/v1/offboarding", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) {
        const text = await response.text()
        setError(text || "Offboarding thất bại")
        setLoading(false)
        return
      }
      try {
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage)
          for (const key of keys) {
            if (
              key.startsWith("conv_messages_") ||
              key.startsWith("conv_title_") ||
              key.startsWith("friend_conv_messages_") ||
              key.startsWith("friend_conv_title_")
            ) {
              localStorage.removeItem(key)
            }
          }
          localStorage.removeItem("authToken")
          localStorage.removeItem("userId")
        }
      } catch {}
      setSuccess("Đã offboarding và xóa dữ liệu hội thoại")
      setTimeout(() => router.replace("/login"), 800)
    } catch (reason: any) {
      setError(reason?.message || "Có lỗi xảy ra khi offboarding")
    } finally {
      setLoading(false)
    }
  }

  const joinInfo = useMemo(() => get_join_info(profile.joined_at), [profile.joined_at])
  const maskedPhone = useMemo(() => mask_phone(profile.phone), [profile.phone])
  const socialLinkedCount = useMemo(() => {
    return Number(Boolean(profile.social_links?.google)) + Number(Boolean(profile.social_links?.facebook))
  }, [profile.social_links?.facebook, profile.social_links?.google])

  return {
    profile,
    setProfile,
    editingProfile,
    setEditingProfile,
    editingSecurity,
    setEditingSecurity,
    password,
    setPassword,
    shareScores,
    setShareScores,
    shareChatContent,
    setShareChatContent,
    consentLoaded,
    avatarPreview,
    avatarUploading,
    avatarError,
    loading,
    error,
    success,
    token,
    sessionReady,
    joinInfo,
    maskedPhone,
    socialLinkedCount,
    onAvatarChange,
    saveProfile,
    saveSecurity,
    logoutAll,
    logout,
    saveConsent,
    offboard,
  }
}
