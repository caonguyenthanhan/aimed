import { NextRequest, NextResponse } from 'next/server'
import { deviceSyncManager } from '@/lib/device-sync-manager'

/**
 * POST /api/device-sync/register - Register or get device profile
 * Đăng ký hoặc lấy hồ sơ thiết bị
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, deviceName, deviceType } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId' },
        { status: 400 }
      )
    }

    const device = await deviceSyncManager.getOrCreateDevice(
      deviceId,
      deviceName || 'Unknown Device',
      deviceType || 'web'
    )

    return NextResponse.json(device)
  } catch (error) {
    console.error('Error registering device:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/device-sync/history - Get device chat history
 * Lấy lịch sử chat của thiết bị
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get('deviceId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    const history = await deviceSyncManager.getDeviceChatHistory(deviceId, limit)

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching device history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
