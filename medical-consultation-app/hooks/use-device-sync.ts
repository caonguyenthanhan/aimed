import { useState, useEffect, useCallback } from 'react'
import type { DeviceProfile } from '@/lib/device-sync-manager'

interface UseDeviceSyncOptions {
  onDeviceCreated?: (device: DeviceProfile) => void
  onSyncComplete?: () => void
}

/**
 * Hook for managing device synchronization
 * Quản lý đồng bộ hóa dữ liệu theo thiết bị
 */
export function useDeviceSync(options?: UseDeviceSyncOptions) {
  const [device, setDevice] = useState<DeviceProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get or generate device ID from localStorage
  const getDeviceId = useCallback(() => {
    try {
      let deviceId = localStorage.getItem('v0_device_id')
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('v0_device_id', deviceId)
      }
      return deviceId
    } catch {
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }, [])

  // Register device with backend
  const registerDevice = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const deviceId = getDeviceId()
      const deviceName = getDeviceName()
      const deviceType = getDeviceType()

      const response = await fetch('/api/device-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceName, deviceType })
      })

      if (!response.ok) {
        throw new Error('Failed to register device')
      }

      const deviceProfile = await response.json()
      setDevice(deviceProfile)
      options?.onDeviceCreated?.(deviceProfile)

      return deviceProfile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getDeviceId, options])

  // Link device to user account (when user logs in)
  const linkDeviceToUser = useCallback(async (userId: string) => {
    try {
      const deviceId = getDeviceId()

      const response = await fetch('/api/device-sync/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, userId })
      })

      if (!response.ok) {
        throw new Error('Failed to link device to user')
      }

      const updatedDevice = await response.json()
      setDevice(updatedDevice)

      return updatedDevice
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    }
  }, [getDeviceId])

  // Unlink device from user (when user logs out)
  const unlinkDevice = useCallback(async () => {
    try {
      const deviceId = getDeviceId()

      const response = await fetch('/api/device-sync/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      })

      if (!response.ok) {
        throw new Error('Failed to unlink device')
      }

      const updatedDevice = await response.json()
      setDevice(updatedDevice)

      return updatedDevice
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    }
  }, [getDeviceId])

  // Sync pending changes to backend
  const syncChanges = useCallback(async () => {
    try {
      const deviceId = getDeviceId()

      const response = await fetch('/api/device-sync/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      })

      if (!response.ok) {
        throw new Error('Failed to sync changes')
      }

      options?.onSyncComplete?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useDeviceSync] Sync failed:', message)
    }
  }, [getDeviceId, options])

  // Get device chat history
  const getChatHistory = useCallback(async (limit: number = 50) => {
    try {
      const deviceId = getDeviceId()

      const response = await fetch(`/api/device-sync/history?deviceId=${deviceId}&limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch chat history')
      }

      return await response.json()
    } catch (err) {
      console.error('[useDeviceSync] Failed to get history:', err)
      return []
    }
  }, [getDeviceId])

  // Initialize device on mount
  useEffect(() => {
    registerDevice().catch(err => {
      console.error('[useDeviceSync] Failed to register device:', err)
    })
  }, [registerDevice])

  // Setup periodic sync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncChanges().catch(err => {
        console.error('[useDeviceSync] Periodic sync failed:', err)
      })
    }, 30000) // Sync every 30 seconds

    return () => clearInterval(syncInterval)
  }, [syncChanges])

  return {
    device,
    loading,
    error,
    deviceId: device?.device_id || getDeviceId(),
    registerDevice,
    linkDeviceToUser,
    unlinkDevice,
    syncChanges,
    getChatHistory
  }
}

/**
 * Helper: Get device name from user agent
 */
function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device'

  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('iphone')) return 'iPhone'
  if (ua.includes('ipad')) return 'iPad'
  if (ua.includes('android')) return 'Android Device'
  if (ua.includes('windows')) return 'Windows PC'
  if (ua.includes('mac')) return 'Mac'
  if (ua.includes('linux')) return 'Linux'
  return 'Web Browser'
}

/**
 * Helper: Detect device type
 */
function getDeviceType(): 'web' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'web'

  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('ipad') || (ua.includes('android') && ua.includes('tablet'))) {
    return 'tablet'
  }
  if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) {
    return 'mobile'
  }
  return 'web'
}
