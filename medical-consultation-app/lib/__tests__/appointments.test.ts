import { describe, it, expect } from "vitest"
import { normalizeAppointment, newAppointmentId } from "../appointments"

describe("appointments utils", () => {
  const valid = {
    id: "ap-001",
    doctor_id: "doctor_001",
    patient_name: "Nguyen Van A",
    scheduled_at: "2026-07-01T09:00:00.000Z",
    reason: "Kham tong quat",
    status: "pending",
    created_at: "2026-06-01T08:00:00.000Z",
    contact: { phone: "0901234567", email: "test@example.com" },
  }

  describe("normalizeAppointment", () => {
    it("returns normalized appointment for valid input", () => {
      const result = normalizeAppointment(valid)
      expect(result).not.toBeNull()
      expect(result?.id).toBe("ap-001")
      expect(result?.doctor_id).toBe("doctor_001")
      expect(result?.status).toBe("pending")
      expect(result?.contact.phone).toBe("0901234567")
    })

    it("returns null when id is missing", () => {
      expect(normalizeAppointment({ ...valid, id: "" })).toBeNull()
    })

    it("returns null when doctor_id is missing", () => {
      expect(normalizeAppointment({ ...valid, doctor_id: "" })).toBeNull()
    })

    it("returns null when patient_name is missing", () => {
      expect(normalizeAppointment({ ...valid, patient_name: "" })).toBeNull()
    })

    it("returns null when scheduled_at is missing", () => {
      expect(normalizeAppointment({ ...valid, scheduled_at: "" })).toBeNull()
    })

    it("returns null when reason is missing", () => {
      expect(normalizeAppointment({ ...valid, reason: "" })).toBeNull()
    })

    it("returns null when created_at is missing", () => {
      expect(normalizeAppointment({ ...valid, created_at: "" })).toBeNull()
    })

    it("returns null for invalid status", () => {
      expect(normalizeAppointment({ ...valid, status: "unknown" })).toBeNull()
    })

    it("accepts all valid statuses", () => {
      for (const status of ["pending", "confirmed", "cancelled", "completed"]) {
        expect(normalizeAppointment({ ...valid, status })).not.toBeNull()
      }
    })

    it("handles missing contact gracefully", () => {
      const result = normalizeAppointment({ ...valid, contact: null })
      expect(result).not.toBeNull()
      expect(result?.contact.phone).toBeUndefined()
      expect(result?.contact.email).toBeUndefined()
    })

    it("returns null for null input", () => {
      expect(normalizeAppointment(null)).toBeNull()
    })
  })

  describe("newAppointmentId", () => {
    it("returns a string starting with ap-", () => {
      expect(newAppointmentId().startsWith("ap-")).toBe(true)
    })

    it("returns unique ids each call", () => {
      const ids = new Set(Array.from({ length: 20 }, () => newAppointmentId()))
      expect(ids.size).toBe(20)
    })
  })
})
