"use client"

import type { DoctorProfilePublic } from "@/lib/doctor-profile"

export function DoctorProfileView({ profile }: { profile: DoctorProfilePublic }) {
  const p = profile
  const specs = Array.isArray(p?.specialties) ? p.specialties : []
  const langs = Array.isArray(p?.languages) ? p.languages : []
  const modes = Array.isArray(p?.consultationModes) ? p.consultationModes : []

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-200 overflow-hidden shrink-0">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={p.displayName} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{p.displayName || "Bác sĩ"}</div>
            <div className="text-sm text-slate-600 mt-1">{p.title || ""}</div>
            {specs.length ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {specs.slice(0, 10).map((s) => (
                  <span key={s} className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {p.bio ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Giới thiệu</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{p.bio}</div>
          </div>
        ) : null}

        {p.clinicName || p.clinicAddress ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Phòng khám / Nơi làm việc</div>
            <div className="text-sm text-slate-700">{p.clinicName || ""}</div>
            {p.clinicAddress ? <div className="text-sm text-slate-600">{p.clinicAddress}</div> : null}
          </div>
        ) : null}

        {langs.length || modes.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold text-slate-900">Ngôn ngữ</div>
              <div className="text-sm text-slate-700 mt-2">{langs.length ? langs.join(", ") : "—"}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold text-slate-900">Hình thức tư vấn</div>
              <div className="text-sm text-slate-700 mt-2">{modes.length ? modes.join(", ") : "—"}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
