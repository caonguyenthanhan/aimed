'use client'

import { useEffect, useRef, useCallback } from 'react'

interface SyncEvent {
  type: 'message-added' | 'conversation-created' | 'conversation-updated' | 'message-deleted'
  timestamp: number
  data: any
}

/**
 * Multi-device sync manager
 * Polls server for changes and broadcasts updates to UI
 */
export function useMultiDeviceSync(userId: string, onSync?: (event: SyncEvent) => void) {
  const syncRef = useRef<{
    lastSyncTime: number
    isPolling: boolean
    pollInterval: NodeJS.Timeout | null
  }>({
    lastSyncTime: Date.now(),
    isPolling: false,
    pollInterval: null,
  })

  // Check for changes since last sync
  const checkForChanges = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/sync/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          since: syncRef.current.lastSyncTime,
        }),
      })

      if (!response.ok) return

      const { changes } = await response.json()
      
      if (Array.isArray(changes) && changes.length > 0) {
        // Update last sync time
        syncRef.current.lastSyncTime = Date.now()

        // Broadcast each change
        changes.forEach((change) => {
          onSync?.(change)
        })
      }
    } catch (error) {
      console.debug('[v0] Sync check failed:', error)
    }
  }, [userId, onSync])

  // Start polling for changes
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    // Initial sync check
    checkForChanges()

    // Poll every 5 seconds
    syncRef.current.pollInterval = setInterval(() => {
      checkForChanges()
    }, 5000)

    return () => {
      if (syncRef.current.pollInterval) {
        clearInterval(syncRef.current.pollInterval)
      }
    }
  }, [userId, checkForChanges])

  return {
    syncNow: checkForChanges,
  }
}

/**
 * Broadcast sync event to other tabs/windows
 */
export function broadcastSyncEvent(event: SyncEvent) {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const key = `__sync_event_${Date.now()}_${Math.random()}`
    localStorage.setItem(key, JSON.stringify(event))
    
    // Clean up after broadcast
    setTimeout(() => localStorage.removeItem(key), 100)
  } catch (error) {
    console.debug('[v0] Broadcast failed:', error)
  }
}

/**
 * Listen for sync events from other tabs
 */
export function useLocalSyncListener(onEvent?: (event: SyncEvent) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key?.startsWith('__sync_event_')) return
      
      try {
        const syncEvent: SyncEvent = JSON.parse(event.newValue || '{}')
        onEvent?.(syncEvent)
      } catch (error) {
        console.debug('[v0] Failed to parse sync event:', error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [onEvent])
}
