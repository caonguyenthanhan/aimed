import type { DoctorProfile, DoctorProfilePrivate, DoctorProfilePublic } from "@/lib/doctor-profile"
import { defaultPublicProfile, normalizePrivateProfile, normalizePublicProfile } from "@/lib/doctor-profile"

const PUBLIC_KEY = "mcs_doctor_profile_public_v1"
const PRIVATE_KEY = "mcs_doctor_profile_private_v1"

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadLocalDoctorPublic(seed?: { displayName?: string }): DoctorProfilePublic {
  try {
    const raw = localStorage.getItem(PUBLIC_KEY)
    const parsed = safeJsonParse<any>(raw)
    const n = normalizePublicProfile(parsed || {})
    const base = defaultPublicProfile(seed)
    return { ...base, ...n, specialties: n.specialties.length ? n.specialties : base.specialties }
  } catch {
    return defaultPublicProfile(seed)
  }
}

export function loadLocalDoctorPrivate(): DoctorProfilePrivate {
  try {
    const raw = localStorage.getItem(PRIVATE_KEY)
    const parsed = safeJsonParse<any>(raw)
    return normalizePrivateProfile(parsed || {})
  } catch {
    return {}
  }
}

export function saveLocalDoctorProfile(publicProfile: DoctorProfilePublic, privateProfile: DoctorProfilePrivate) {
  try {
    localStorage.setItem(PUBLIC_KEY, JSON.stringify(publicProfile))
  } catch {}
  try {
    localStorage.setItem(PRIVATE_KEY, JSON.stringify(privateProfile))
  } catch {}
}

export function toLocalDoctorProfile(doctorId: string, publicProfile: DoctorProfilePublic, privateProfile: DoctorProfilePrivate): DoctorProfile {
  return { doctor_id: doctorId, public: publicProfile, private: privateProfile, updated_at: new Date().toISOString() }
}
