export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed"

export type AppointmentContact = {
  phone?: string
  email?: string
}

export type Appointment = {
  id: string
  doctor_id: string
  patient_name: string
  contact: AppointmentContact
  scheduled_at: string
  reason: string
  status: AppointmentStatus
  created_at: string
}

export function normalizeAppointment(x: any): Appointment | null {
  const id = String(x?.id || "").trim()
  const doctor_id = String(x?.doctor_id || "").trim()
  const patient_name = String(x?.patient_name || "").trim()
  const scheduled_at = String(x?.scheduled_at || "").trim()
  const reason = String(x?.reason || "").trim()
  const status = String(x?.status || "").trim() as AppointmentStatus
  const created_at = String(x?.created_at || "").trim()
  if (!id || !doctor_id || !patient_name || !scheduled_at || !reason || !created_at) return null
  if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) return null
  const contactRaw = x?.contact || {}
  const contact: AppointmentContact = {
    phone: String(contactRaw?.phone || "").trim() || undefined,
    email: String(contactRaw?.email || "").trim() || undefined,
  }
  return { id, doctor_id, patient_name, contact, scheduled_at, reason, status, created_at }
}

export function newAppointmentId() {
  return `ap-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

