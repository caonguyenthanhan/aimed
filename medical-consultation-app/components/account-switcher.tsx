'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import {
  getUniqueAccounts,
  switchAccount,
  removeAccountFromHistory,
  AccountSession,
  getRoleColor,
  getRoleLabel,
  formatLastAccessed,
  saveCurrentSession,
} from '@/lib/account-manager'
import { Clock, LogIn, Plus, Trash2 } from 'lucide-react'

export default function AccountSwitcher() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [accounts, setAccounts] = useState<AccountSession[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountSession | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId')
      setCurrentUserId(userId || '')
      loadAccounts()
    }
  }, [])

  const loadAccounts = () => {
    const uniqueAccounts = getUniqueAccounts()
    setAccounts(uniqueAccounts)
  }

  const handleSwitchClick = (account: AccountSession) => {
    setSelectedAccount(account)
    setShowConfirm(true)
  }

  const handleConfirmSwitch = async () => {
    if (!selectedAccount) return

    setIsSwitching(true)
    setShowConfirm(false)
    try {
      // Save current session before switching
      saveCurrentSession()

      // Switch to the selected account
      switchAccount(selectedAccount)

      // Redirect to home/dashboard using window.location
      window.location.href = '/'
    } catch (error) {
      console.error('[v0] Error switching account:', error)
      setIsSwitching(false)
    }
  }

  const handleRemoveAccount = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
    removeAccountFromHistory(userId)
    loadAccounts()
  }

  const handleAddAccount = () => {
    // Save current session before logging out
    saveCurrentSession()

    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userFullName')
      localStorage.removeItem('username')
    }

    window.location.href = '/login?mode=add-account'
  }

  if (!mounted) return null

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Quản lý tài khoản
          </h2>
        </div>

        {/* Current Account */}
        {accounts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Tài khoản hoạt động
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              {accounts
                .filter((acc) => acc.userId === currentUserId)
                .map((account) => (
                  <div key={account.id} className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {account.avatar_url && (
                        <AvatarImage src={account.avatar_url} alt={account.full_name} />
                      )}
                      <AvatarFallback className="font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {account.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                        {account.full_name}
                      </p>
                      {account.email && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {account.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(
                            account.userRole
                          )}`}
                        >
                          {getRoleLabel(account.userRole)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastAccessed(account.lastAccessed)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Other Accounts */}
        {accounts.filter((acc) => acc.userId !== currentUserId).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Tài khoản khác
            </h3>
            <div className="space-y-2">
              {accounts
                .filter((acc) => acc.userId !== currentUserId)
                .map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleSwitchClick(account)}
                    className="w-full text-left flex items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {account.avatar_url && (
                          <AvatarImage src={account.avatar_url} alt={account.full_name} />
                        )}
                        <AvatarFallback className="font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {account.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {account.full_name}
                        </p>
                        {account.email && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {account.email}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(
                              account.userRole
                            )}`}
                          >
                            {getRoleLabel(account.userRole)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastAccessed(account.lastAccessed)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleRemoveAccount(e, account.userId)}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                      title="Xóa từ lịch sử"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Add Account Button */}
        <Button
          onClick={handleAddAccount}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Thêm tài khoản khác
        </Button>

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <LogIn className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Chưa có tài khoản nào được lưu. Hãy đăng nhập với các tài khoản khác để thêm chúng vào đây.
            </p>
          </div>
        )}

        {/* Security Info */}
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>🔒 Bảo mật:</strong> Các tài khoản được lưu an toàn trong thiết bị của bạn. Luôn đảm bảo bạn đang sử dụng một thiết bị đáng tin cậy.
          </p>
        </div>
      </div>

      {/* Switch Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển đổi tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp chuyển sang tài khoản <strong>{selectedAccount?.full_name}</strong>. Phiên hiện tại của bạn sẽ được lưu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            💡 Bạn có thể quay lại tài khoản trước bất kỳ lúc nào từ menu tài khoản.
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isSwitching}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSwitch}
              disabled={isSwitching}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSwitching ? 'Đang chuyển...' : 'Chuyển đổi'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
