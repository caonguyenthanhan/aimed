/**
 * Account Manager Utility
 * Handles multi-account session tracking, history management, and account switching logic
 */

export interface AccountSession {
  id: string
  userId: string
  username: string
  email?: string
  full_name: string
  userRole: 'doctor' | 'patient'
  avatar_url?: string
  authToken: string
  timestamp: number
  lastAccessed: number
}

const ACCOUNT_HISTORY_KEY = 'account_history'
const CURRENT_SESSION_KEY = 'current_session'
const MAX_STORED_ACCOUNTS = 5

/**
 * Save the current session to account history
 */
export function saveCurrentSession(): void {
  if (typeof window === 'undefined') return
  
  try {
    const authToken = localStorage.getItem('authToken')
    const userId = localStorage.getItem('userId')
    const username = localStorage.getItem('username') || ''
    const userRole = (localStorage.getItem('userRole') || 'patient') as 'doctor' | 'patient'
    const userFullName = localStorage.getItem('userFullName') || username
    const email = localStorage.getItem('userEmail') || ''
    
    if (!authToken || !userId) return
    
    const session: AccountSession = {
      id: `${userId}-${Date.now()}`,
      userId,
      username,
      email,
      full_name: userFullName,
      userRole,
      authToken,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    }
    
    const history = getAccountHistory()
    const filtered = history.filter(acc => acc.userId !== userId)
    const updated = [session, ...filtered].slice(0, MAX_STORED_ACCOUNTS)
    
    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(updated))
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('[v0] Error saving account session:', error)
  }
}

/**
 * Get the account history (recently used accounts)
 */
export function getAccountHistory(): AccountSession[] {
  if (typeof window === 'undefined') return []
  
  try {
    const history = localStorage.getItem(ACCOUNT_HISTORY_KEY)
    if (!history) return []
    const parsed = JSON.parse(history) as AccountSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('[v0] Error retrieving account history:', error)
    return []
  }
}

/**
 * Get the current active session
 */
export function getCurrentSession(): AccountSession | null {
  if (typeof window === 'undefined') return null
  
  try {
    const session = localStorage.getItem(CURRENT_SESSION_KEY)
    if (!session) return null
    return JSON.parse(session) as AccountSession
  } catch (error) {
    console.error('[v0] Error retrieving current session:', error)
    return null
  }
}

/**
 * Get unique accounts from history (latest by userId)
 */
export function getUniqueAccounts(): AccountSession[] {
  const history = getAccountHistory()
  const seen = new Set<string>()
  return history.filter(account => {
    if (seen.has(account.userId)) return false
    seen.add(account.userId)
    return true
  })
}

/**
 * Switch to a different account
 */
export function switchAccount(account: AccountSession): void {
  if (typeof window === 'undefined') return
  
  try {
    // Save current session before switching
    saveCurrentSession()
    
    // Load the new account
    localStorage.setItem('authToken', account.authToken)
    localStorage.setItem('userId', account.userId)
    localStorage.setItem('username', account.username)
    localStorage.setItem('userRole', account.userRole)
    localStorage.setItem('userFullName', account.full_name)
    if (account.email) {
      localStorage.setItem('userEmail', account.email)
    }
    
    // Update last accessed time
    const history = getAccountHistory()
    const updated = history.map(acc => 
      acc.userId === account.userId 
        ? { ...acc, lastAccessed: Date.now() }
        : acc
    )
    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(updated))
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({
      ...account,
      lastAccessed: Date.now(),
    }))
  } catch (error) {
    console.error('[v0] Error switching account:', error)
    throw error
  }
}

/**
 * Remove an account from history
 */
export function removeAccountFromHistory(userId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const history = getAccountHistory()
    const filtered = history.filter(acc => acc.userId !== userId)
    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[v0] Error removing account from history:', error)
  }
}

/**
 * Clear all account history
 */
export function clearAccountHistory(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(ACCOUNT_HISTORY_KEY)
    localStorage.removeItem(CURRENT_SESSION_KEY)
  } catch (error) {
    console.error('[v0] Error clearing account history:', error)
  }
}

/**
 * Get role badge color for UI display
 */
export function getRoleColor(role: 'doctor' | 'patient'): string {
  return role === 'doctor' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
}

/**
 * Get role label in Vietnamese
 */
export function getRoleLabel(role: 'doctor' | 'patient'): string {
  return role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'
}

/**
 * Format last accessed time for display
 */
export function formatLastAccessed(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes}m trước`
  if (hours < 24) return `${hours}h trước`
  if (days < 7) return `${days} ngày trước`
  
  return new Date(timestamp).toLocaleDateString('vi-VN')
}
