import { NextRequest, NextResponse } from 'next/server'
import { deviceSyncManager } from '@/lib/device-sync-manager'

/**
 * POST /api/device-sync/unlink - Unlink device from user account
 * Gỡ liên kết thiết bị khỏi tài khoản người dùng khi đăng xuất
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required field: deviceId' },
        { status: 400 }
      )
    }

    // Unlink device from user
    await deviceSyncManager.unlinkDeviceFromUser(deviceId)

    return NextResponse.json({ 
      success: true,
      message: 'Device unlinked successfully'
    })
  } catch (error) {
    console.error('[device-sync/unlink] Error unlinking device:', error)
    return NextResponse.json(
      { error: 'Failed to unlink device' },
      { status: 500 }
    )
  }
}
