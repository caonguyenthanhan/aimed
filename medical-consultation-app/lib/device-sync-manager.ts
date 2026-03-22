// Device-based Sync Manager
// Quản lý đồng bộ hóa dữ liệu theo thiết bị

import { getNeonPool } from './neon-db'
import { v4 as uuidv4 } from 'uuid'

export interface DeviceProfile {
  device_id: string
  device_name: string
  device_type: 'web' | 'mobile' | 'tablet'
  user_id: string | null
  last_synced: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SyncRecord {
  id: string
  device_id: string
  user_id: string | null
  entity_type: 'chat_message' | 'agent_suggestion' | 'content_recommendation' | 'appointment'
  entity_id: string
  action: 'create' | 'update' | 'delete'
  synced_at: Date
  device_timestamp: Date
}

/**
 * Device Sync Manager handles:
 * - Device identification and profile management
 * - Local device sync tracking
 * - Cross-device synchronization when user logs in
 * - Data merging when linking accounts
 */
export class DeviceSyncManager {
  private pool = getNeonPool()

  /**
   * Get or create device profile
   * Nếu chưa có device, tạo mới; nếu có rồi thì lấy
   */
  async getOrCreateDevice(
    deviceId: string,
    deviceName: string = 'Unknown Device',
    deviceType: 'web' | 'mobile' | 'tablet' = 'web'
  ): Promise<DeviceProfile> {
    const client = await this.pool.connect()
    try {
      // Check if device exists
      const existingDevice = await client.query(
        'SELECT * FROM device_profiles WHERE device_id = $1',
        [deviceId]
      )

      if (existingDevice.rows.length > 0) {
        // Update last_synced
        const updated = await client.query(
          `UPDATE device_profiles 
           SET last_synced = NOW(), updated_at = NOW()
           WHERE device_id = $1
           RETURNING *`,
          [deviceId]
        )
        return updated.rows[0]
      }

      // Create new device profile
      const newDevice = await client.query(
        `INSERT INTO device_profiles 
         (device_id, device_name, device_type, last_synced, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), true, NOW(), NOW())
         RETURNING *`,
        [deviceId, deviceName, deviceType]
      )

      return newDevice.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Link device to user account
   * Liên kết thiết bị với tài khoản người dùng
   */
  async linkDeviceToUser(deviceId: string, userId: string): Promise<DeviceProfile> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `UPDATE device_profiles 
         SET user_id = $1, updated_at = NOW()
         WHERE device_id = $2
         RETURNING *`,
        [userId, deviceId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Device ${deviceId} not found`)
      }

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Unlink device from user (for logout)
   * Gỡ liên kết thiết bị khỏi tài khoản
   */
  async unlinkDeviceFromUser(deviceId: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `UPDATE device_profiles 
         SET user_id = NULL, updated_at = NOW()
         WHERE device_id = $1`,
        [deviceId]
      )
    } finally {
      client.release()
    }
  }

  /**
   * Record a sync event for later merging
   * Ghi lại sự kiện đồng bộ hóa
   */
  async recordSync(
    deviceId: string,
    userId: string | null,
    entityType: 'chat_message' | 'agent_suggestion' | 'content_recommendation' | 'appointment',
    entityId: string,
    action: 'create' | 'update' | 'delete',
    deviceTimestamp: Date = new Date()
  ): Promise<SyncRecord> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO sync_queue 
         (device_id, user_id, entity_type, entity_id, action, device_timestamp, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [deviceId, userId, entityType, entityId, action, deviceTimestamp]
      )

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Get pending syncs for a device
   * Lấy các đồng bộ hóa đang chờ xử lý
   */
  async getPendingSyncs(deviceId: string, limit: number = 100): Promise<SyncRecord[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM sync_queue 
         WHERE device_id = $1 AND synced_at IS NULL
         ORDER BY device_timestamp ASC
         LIMIT $2`,
        [deviceId, limit]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Mark syncs as completed
   * Đánh dấu các đồng bộ hóa là hoàn tất
   */
  async markSyncsCompleted(syncIds: string[]): Promise<void> {
    if (syncIds.length === 0) return

    const client = await this.pool.connect()
    try {
      const placeholders = syncIds.map((_, i) => `$${i + 1}`).join(',')
      await client.query(
        `UPDATE sync_queue 
         SET synced_at = NOW()
         WHERE id IN (${placeholders})`,
        syncIds
      )
    } finally {
      client.release()
    }
  }

  /**
   * Get device's chat history
   * Lấy lịch sử chat của thiết bị
   */
  async getDeviceChatHistory(deviceId: string, limit: number = 50): Promise<any[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM chat_messages 
         WHERE device_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [deviceId, limit]
      )
      return result.rows.reverse() // Return in chronological order
    } finally {
      client.release()
    }
  }

  /**
   * Merge chat history when linking device to user account
   * Hợp nhất lịch sử chat khi liên kết tài khoản
   */
  async mergeDeviceHistoryToUser(deviceId: string, userId: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Update all messages from this device to be associated with user
      await client.query(
        `UPDATE chat_messages 
         SET user_id = $1
         WHERE device_id = $2 AND user_id IS NULL`,
        [userId, deviceId]
      )

      // Update sync queue records
      await client.query(
        `UPDATE sync_queue 
         SET user_id = $1
         WHERE device_id = $2 AND user_id IS NULL`,
        [userId, deviceId]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get all devices linked to a user
   * Lấy tất cả các thiết bị liên kết với người dùng
   */
  async getUserDevices(userId: string): Promise<DeviceProfile[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM device_profiles 
         WHERE user_id = $1
         ORDER BY last_synced DESC`,
        [userId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Generate a new device ID
   * Tạo ID thiết bị mới
   */
  generateDeviceId(): string {
    return `device_${uuidv4()}`
  }
}

export const deviceSyncManager = new DeviceSyncManager()
