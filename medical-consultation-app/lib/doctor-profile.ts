export type DoctorProfilePublic = {
  displayName: string
  title: string
  specialties: string[]
  bio: string
  avatarUrl?: string
  clinicName?: string
  clinicAddress?: string
  languages?: string[]
  consultationModes?: string[]
}

export type DoctorProfilePrivate = {
  phone?: string
  email?: string
  address?: string
  notes?: string
  assistantPrompt?: string
}

export type DoctorProfile = {
  doctor_id: string
  public: DoctorProfilePublic
  private: DoctorProfilePrivate
  updated_at?: string
}

export function normalizePublicProfile(p: any): DoctorProfilePublic {
  const specialties = Array.isArray(p?.specialties) ? p.specialties : []
  const languages = Array.isArray(p?.languages) ? p.languages : []
  const consultationModes = Array.isArray(p?.consultationModes) ? p.consultationModes : []
  return {
    displayName: String(p?.displayName || "").trim(),
    title: String(p?.title || "").trim(),
    specialties: specialties.map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 20),
    bio: String(p?.bio || "").trim(),
    avatarUrl: String(p?.avatarUrl || "").trim() || undefined,
    clinicName: String(p?.clinicName || "").trim() || undefined,
    clinicAddress: String(p?.clinicAddress || "").trim() || undefined,
    languages: languages.map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 12),
    consultationModes: consultationModes.map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 12),
  }
}

export function normalizePrivateProfile(p: any): DoctorProfilePrivate {
  const prompt = String(p?.assistantPrompt || "").trim()
  return {
    phone: String(p?.phone || "").trim() || undefined,
    email: String(p?.email || "").trim() || undefined,
    address: String(p?.address || "").trim() || undefined,
    notes: String(p?.notes || "").trim() || undefined,
    assistantPrompt: prompt ? prompt.slice(0, 4000) : undefined,
  }
}

export function defaultPublicProfile(seed?: { displayName?: string }): DoctorProfilePublic {
  const name = String(seed?.displayName || "").trim() || "Bác sĩ"
  return {
    displayName: name,
    title: "Bác sĩ",
    specialties: [],
    bio: "",
    languages: ["Tiếng Việt"],
    consultationModes: ["Online"],
  }
}
