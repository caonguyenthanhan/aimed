"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEST_ACCOUNTS, findTestAccount } from "@/lib/test-accounts"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (token) {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => {
      try {
        // @ts-ignore
        const google = (window as any).google
        if (!google || !google.accounts || !google.accounts.id) return
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            const credential = response?.credential
            if (!credential) return
            try {
              const resp = await fetch('/api/backend/v1/login/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: credential })
              })
              const data = await resp.json()
              if (!resp.ok) {
                setError(data?.detail || 'Đăng nhập Google thất bại')
                return
              }
              const token = data?.token || ''
              const userId = data?.user_id || ''
              if (typeof window !== 'undefined') {
                localStorage.setItem('authToken', token)
                localStorage.setItem('userId', userId)
              }
              router.replace('/')
            } catch (e: any) {
              setError(e?.message || 'Có lỗi xảy ra khi đăng nhập Google')
            }
          }
        })
        setGoogleReady(true)
      } catch {}
    }
    document.head.appendChild(s)
    return () => {
      try { document.head.removeChild(s) } catch {}
    }
  }, [])

  const handleTestAccountLogin = (accountUsername: string, accountPassword: string) => {
    const account = findTestAccount(accountUsername, accountPassword)
    if (!account) {
      setError('Tài khoản test không hợp lệ')
      return
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', `test_token_${account.id}`)
      localStorage.setItem('userId', account.id)
      localStorage.setItem('username', account.username)
      localStorage.setItem('userFullName', account.fullName)
      localStorage.setItem('userRole', account.role)
    }
    router.replace(account.role === 'doctor' ? '/doctor' : '/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Try test accounts first
      const testAccount = findTestAccount(username, password)
      if (testAccount) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', `test_token_${testAccount.id}`)
          localStorage.setItem('userId', testAccount.id)
          localStorage.setItem('username', testAccount.username)
          localStorage.setItem('userFullName', testAccount.fullName)
          localStorage.setItem('userRole', testAccount.role)
        }
        router.replace(testAccount.role === 'doctor' ? '/doctor' : '/')
        return
      }
      
      // Try real backend
      const resp = await fetch('/api/backend/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data?.detail || 'Đăng nhập thất bại')
        setLoading(false)
        return
      }
      const token = data?.token || ''
      const userId = data?.user_id || ''
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token)
        localStorage.setItem('userId', userId)
        localStorage.setItem('userRole', data?.role || 'patient')
      }
      router.replace('/')
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div suppressHydrationWarning className="w-full max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Đăng nhập</h1>
          <p className="text-slate-600 text-sm mb-6">Chọn tài khoản test hoặc đăng nhập bằng thông tin của bạn</p>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}
          
          {/* Test Accounts Section */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <button
              type="button"
              onClick={() => setShowTestAccounts(!showTestAccounts)}
              className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline"
            >
              {showTestAccounts ? '▼' : '▶'} Tài khoản Test (Demo)
            </button>
            {showTestAccounts && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Doctor Accounts */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">👨‍⚕️ Bác sĩ</p>
                  {TEST_ACCOUNTS.doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleTestAccountLogin(doc.username, doc.password)}
                      className="w-full mb-2 p-2 text-left text-xs rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-50">{doc.fullName}</div>
                      <div className="text-slate-500 dark:text-slate-400">{doc.specialty}</div>
                      <div className="text-slate-400 text-xs mt-1">{doc.username}</div>
                    </button>
                  ))}
                </div>
                
                {/* Patient Accounts */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">👩‍💼 Bệnh nhân</p>
                  {TEST_ACCOUNTS.patients.map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => handleTestAccountLogin(pat.username, pat.password)}
                      className="w-full mb-2 p-2 text-left text-xs rounded-lg bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-50">{pat.fullName}</div>
                      <div className="text-slate-500 dark:text-slate-400">Tuổi: {pat.age}</div>
                      <div className="text-slate-400 text-xs mt-1">{pat.username}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Manual Login Form */}
          <div className="mb-6 pb-6 border-t border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900 mt-6 mb-4">Hoặc đăng nhập với thông tin của bạn</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="username"
                  placeholder="Nhập tên đăng nhập hoặc email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 dark:bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
          {/* Google Login */}
          {googleReady && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div id="g_id_onload" data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} data-auto_prompt="false"></div>
              <div className="g_id_signin" data-type="standard" data-theme="outline" data-text="signin_with" data-size="large"></div>
            </div>
          )}
          {!googleReady && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 pt-6 border-t border-slate-200">Thiết lập `NEXT_PUBLIC_GOOGLE_CLIENT_ID` để bật đăng nhập Google.</p>
          )}
        </div>
        
        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>Chưa có tài khoản? <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Đăng ký ngay</a></p>
        </div>
      </div>
    </div>
  )
}
