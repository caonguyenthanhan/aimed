import { NextRequest, NextResponse } from 'next/server'
import { deviceSyncManager } from '@/lib/device-sync-manager'

/**
 * POST /api/device-sync/link - Link device to user account
 * Liên kết thiết bị với tài khoản người dùng khi đăng nhập
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, userId } = body

    if (!deviceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceId, userId' },
        { status: 400 }
      )
    }

    // Link device to user
    const device = await deviceSyncManager.linkDeviceToUser(deviceId, userId)

    // Merge device history with user account
    try {
      await deviceSyncManager.mergeDeviceHistoryToUser(deviceId, userId)
    } catch (mergeError) {
      console.error('[device-sync/link] Merge history failed:', mergeError)
      // Don't fail the request if merge fails
    }

    return NextResponse.json(device)
  } catch (error) {
    console.error('[device-sync/link] Error linking device:', error)
    return NextResponse.json(
      { error: 'Failed to link device' },
      { status: 500 }
    )
  }
}
