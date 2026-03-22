import { NextRequest, NextResponse } from 'next/server'
import { deviceSyncManager } from '@/lib/device-sync-manager'

/**
 * GET /api/device-sync/user-devices - Get all devices linked to user
 * Lấy tất cả các thiết bị liên kết với người dùng
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    const devices = await deviceSyncManager.getUserDevices(userId)

    return NextResponse.json(devices)
  } catch (error) {
    console.error('[device-sync/user-devices] Error getting devices:', error)
    return NextResponse.json(
      { error: 'Failed to get user devices' },
      { status: 500 }
    )
  }
}
