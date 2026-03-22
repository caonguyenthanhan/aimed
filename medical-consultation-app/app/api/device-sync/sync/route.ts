import { NextRequest, NextResponse } from 'next/server'
import { deviceSyncManager } from '@/lib/device-sync-manager'

/**
 * POST /api/device-sync/sync - Sync pending changes for a device
 * Đồng bộ hóa các thay đổi đang chờ xử lý cho thiết bị
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, syncIds } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required field: deviceId' },
        { status: 400 }
      )
    }

    // Get pending syncs for the device
    const pendingSyncs = await deviceSyncManager.getPendingSyncs(deviceId, 100)

    if (pendingSyncs.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No pending syncs'
      })
    }

    // Process each pending sync
    const syncedIds: string[] = []
    const errors: any[] = []

    for (const sync of pendingSyncs) {
      try {
        // Here you would process each sync event
        // For now, we just mark them as synced
        syncedIds.push(sync.id)
      } catch (error) {
        errors.push({
          syncId: sync.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Mark all successfully processed syncs as completed
    if (syncedIds.length > 0) {
      await deviceSyncManager.markSyncsCompleted(syncedIds)
    }

    return NextResponse.json({
      success: true,
      synced: syncedIds.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('[device-sync/sync] Error syncing device:', error)
    return NextResponse.json(
      { error: 'Failed to sync device' },
      { status: 500 }
    )
  }
}
