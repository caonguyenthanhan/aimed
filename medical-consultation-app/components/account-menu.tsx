'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, Users, ChevronDown } from 'lucide-react'
import { saveCurrentSession } from '@/lib/account-manager'

interface AccountMenuProps {
  userLabel: string
  userRole: 'doctor' | 'patient'
  userFullName?: string
  userEmail?: string
  avatarUrl?: string
}

export default function AccountMenu({
  userLabel,
  userRole,
  userFullName,
  userEmail,
  avatarUrl,
}: AccountMenuProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm font-medium">
        <span className="hidden sm:inline">{userLabel}</span>
        <span className="sm:hidden">👤</span>
      </div>
    )
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setShowLogoutConfirm(false)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
        localStorage.removeItem('userId')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userFullName')
        localStorage.removeItem('username')
      }
      // Navigate using window.location for safety
      window.location.href = '/login'
    } catch (error) {
      console.error('[v0] Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  const handleLogoutAll = async () => {
    setIsLoggingOut(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      if (token) {
        try {
          await fetch('/api/backend/v1/user/sessions/logout-all', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch (error) {
          console.error('[v0] Logout all API error:', error)
        }
      }

      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (
            key.startsWith('conv_messages_') ||
            key.startsWith('conv_title_') ||
            key.startsWith('friend_conv_messages_') ||
            key.startsWith('friend_conv_title_') ||
            key === 'authToken' ||
            key === 'userId' ||
            key === 'userRole' ||
            key === 'userFullName' ||
            key === 'username' ||
            key === 'account_history' ||
            key === 'current_session'
          ) {
            localStorage.removeItem(key)
          }
        }
      }
      setShowLogoutAllConfirm(false)
      // Navigate using window.location for safety
      window.location.href = '/login'
    } catch (error) {
      console.error('[v0] Logout all error:', error)
      setShowLogoutAllConfirm(false)
      setIsLoggingOut(false)
    }
  }

  const getRoleStyles = () => {
    return userRole === 'doctor'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
  }

  const getRoleLabel = () => {
    return userRole === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 whitespace-nowrap text-sm font-medium group">
            <Avatar className="h-6 w-6">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userFullName || userLabel} />}
              <AvatarFallback className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {userLabel.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{userLabel}</span>
            <ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-180 transition-transform" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Profile Section */}
          <div className="px-4 py-3 space-y-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userFullName || userLabel} />}
                <AvatarFallback className="font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {userLabel.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                  {userFullName || userLabel}
                </p>
                {userEmail && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {userEmail}
                  </p>
                )}
                <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleStyles()}`}>
                  {getRoleLabel()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenuItem asChild>
            <a href="/account" className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Cài đặt tài khoản</span>
            </a>
          </DropdownMenuItem>

          {userRole === "doctor" ? (
            <DropdownMenuItem asChild>
              <a href="/doctor/profile" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Hồ sơ bác sĩ</span>
              </a>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <a href="/account?tab=accounts" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              <span>Chuyển đổi tài khoản</span>
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Logout Options */}
          <DropdownMenuItem
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowLogoutAllConfirm(true)}
            className="flex items-center gap-2 text-orange-600 dark:text-orange-400 focus:bg-orange-50 dark:focus:bg-orange-900/20 focus:text-orange-600 dark:focus:text-orange-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất tất cả thiết bị</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp đăng xuất khỏi tài khoản này trên thiết bị hiện tại. Bạn có thể đăng nhập lại bất kỳ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            💡 Gợi ý: Sử dụng "Chuyển đổi tài khoản" nếu bạn muốn chuyển sang tài khoản khác mà không mất phiên này.
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isLoggingOut}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoggingOut ? 'Đang xử lý...' : 'Đăng xuất'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout All Confirmation Dialog */}
      <AlertDialog open={showLogoutAllConfirm} onOpenChange={setShowLogoutAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi tất cả thiết bị</AlertDialogTitle>
            <AlertDialogDescription>
              Điều này sẽ đăng xuất bạn khỏi tất cả các phiên trên mọi thiết bị. Thao tác này không thể hoàn tác ngay lập tức.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-orange-700 dark:text-orange-400">
            ⚠️ Bạn sẽ cần phải đăng nhập lại trên tất cả các thiết bị.
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isLoggingOut}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAll}
              disabled={isLoggingOut}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoggingOut ? 'Đang xử lý...' : 'Đăng xuất khỏi tất cả'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
