"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const resp = await fetch('/api/backend/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!resp.ok) {
        const t = await resp.text()
        setError(t || 'Đăng ký thất bại')
        setLoading(false)
        return
      }
      setSuccess('Đăng ký thành công. Vui lòng đăng nhập.')
      setTimeout(() => {
        router.replace('/login')
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi đăng ký')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Đăng ký</h1>
        {error && (
          <div className="mb-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-3 text-sm text-green-600">{success}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <div className="text-xs mt-3">
          <a href="/login" className="text-blue-600 hover:underline">Quay lại đăng nhập</a>
        </div>
      </div>
    </div>
  )
}
