// Medical Appointment Service
// Quản lý đặt lịch hẹn với các chuyên gia y tế

import { getNeonPool } from './neon-db'

export interface AppointmentRequest {
  id: string
  user_id: string | null
  device_id: string
  doctor_id?: string
  doctor_name: string
  specialist_type: string
  appointment_date: Date
  appointment_time: string
  reason: string
  notes?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: Date
  updated_at: Date
}

export interface DoctorProfile {
  id: string
  name: string
  specialist_type: string
  qualification: string
  experience_years: number
  availability: {
    [key: string]: string[] // { '2024-03-22': ['09:00', '10:00', ...] }
  }
  rating?: number
  reviews_count?: number
}

/**
 * Appointment Service manages scheduling with medical professionals
 * Placeholder service ready for external calendar integration
 * Quản lý lịch hẹn với các chuyên gia y tế
 */
export class AppointmentService {
  private pool = getNeonPool()

  /**
   * Create appointment request
   * Tạo yêu cầu đặt lịch hẹn
   */
  async createAppointmentRequest(
    deviceId: string,
    userId: string | null,
    doctorName: string,
    specialistType: string,
    appointmentDate: Date,
    appointmentTime: string,
    reason: string,
    notes?: string
  ): Promise<AppointmentRequest> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO medical_appointments 
         (user_id, device_id, doctor_name, specialist_type, appointment_date, 
          appointment_time, reason, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
         RETURNING *`,
        [userId, deviceId, doctorName, specialistType, appointmentDate, appointmentTime, reason, notes || null]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Get appointment by ID
   * Lấy chi tiết lịch hẹn theo ID
   */
  async getAppointment(appointmentId: string): Promise<AppointmentRequest | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM medical_appointments WHERE id = $1',
        [appointmentId]
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Get user's appointments
   * Lấy các lịch hẹn của người dùng
   */
  async getUserAppointments(userId: string, status?: string): Promise<AppointmentRequest[]> {
    const client = await this.pool.connect()
    try {
      let query = 'SELECT * FROM medical_appointments WHERE user_id = $1'
      const params: any[] = [userId]

      if (status) {
        query += ' AND status = $2'
        params.push(status)
      }

      query += ' ORDER BY appointment_date DESC'

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get device's appointments
   * Lấy các lịch hẹn của thiết bị
   */
  async getDeviceAppointments(deviceId: string): Promise<AppointmentRequest[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM medical_appointments WHERE device_id = $1 ORDER BY appointment_date DESC',
        [deviceId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Update appointment status
   * Cập nhật trạng thái lịch hẹn
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ): Promise<AppointmentRequest> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `UPDATE medical_appointments 
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, appointmentId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Appointment ${appointmentId} not found`)
      }

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Cancel appointment
   * Hủy lịch hẹn
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `UPDATE medical_appointments 
         SET status = 'cancelled', notes = CASE 
           WHEN notes IS NULL THEN $2
           ELSE notes || ' | Cancelled: ' || $2
         END, updated_at = NOW()
         WHERE id = $1`,
        [appointmentId, reason || 'User cancelled']
      )
    } finally {
      client.release()
    }
  }

  /**
   * Reschedule appointment
   * Đặt lại lịch hẹn
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: Date,
    newTime: string
  ): Promise<AppointmentRequest> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `UPDATE medical_appointments 
         SET appointment_date = $1, appointment_time = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [newDate, newTime, appointmentId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Appointment ${appointmentId} not found`)
      }

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Get available doctors (stub - requires external API)
   * Lấy danh sách bác sĩ có sẵn
   */
  async getAvailableDoctors(specialistType?: string): Promise<DoctorProfile[]> {
    // This is a stub that will be implemented when doctor directory API is configured
    console.log('[v0] Available doctors stub called for specialist:', specialistType)
    
    // Return empty array for now
    return []
  }

  /**
   * Get doctor availability (stub - requires external calendar API)
   * Lấy lịch rảnh của bác sĩ
   */
  async getDoctorAvailability(doctorId: string, startDate: Date, endDate: Date): Promise<Record<string, string[]>> {
    // This is a stub that will be implemented when calendar API is configured
    console.log('[v0] Doctor availability stub called for doctor:', doctorId)
    
    // Return empty object for now
    return {}
  }

  /**
   * Send appointment confirmation (stub - requires email/SMS service)
   * Gửi xác nhận lịch hẹn
   */
  async sendAppointmentConfirmation(appointmentId: string, contactMethod: 'email' | 'sms' = 'email'): Promise<void> {
    // This is a stub that will be implemented when notification service is configured
    console.log('[v0] Appointment confirmation stub called via:', contactMethod)
  }

  /**
   * Get appointment statistics
   * Lấy thống kê lịch hẹn
   */
  async getAppointmentStats(): Promise<{
    total: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT status, COUNT(*) as count
         FROM medical_appointments
         GROUP BY status`
      )

      const stats = {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      }

      result.rows.forEach(row => {
        stats[row.status as keyof typeof stats] = parseInt(row.count, 10)
        stats.total += parseInt(row.count, 10)
      })

      return stats
    } finally {
      client.release()
    }
  }

  /**
   * Get upcoming appointments
   * Lấy các lịch hẹn sắp tới
   */
  async getUpcomingAppointments(userId?: string, daysAhead: number = 30): Promise<AppointmentRequest[]> {
    const client = await this.pool.connect()
    try {
      let query = `SELECT * FROM medical_appointments 
                   WHERE appointment_date >= NOW() 
                   AND appointment_date <= NOW() + INTERVAL '${daysAhead} days'
                   AND status IN ('pending', 'confirmed')`
      const params: any[] = []

      if (userId) {
        query += ` AND user_id = $1`
        params.push(userId)
      }

      query += ` ORDER BY appointment_date ASC`

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }
}

export const appointmentService = new AppointmentService()
