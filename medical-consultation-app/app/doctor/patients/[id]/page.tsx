"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Calendar, Mail, Phone, User, FileText, MessageSquare } from "lucide-react"
import { getDemoPatient } from "@/lib/doctor-demo"

export default function DoctorPatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!token || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  const patientId = useMemo(() => {
    const raw = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [params])

  const patient = useMemo(() => {
    if (!patientId) return null
    return getDemoPatient(patientId)
  }, [patientId])

  const conversationId = useMemo(() => {
    const cid = (search?.get("conv") || "").trim()
    if (cid) return cid
    return patientId ? `demo-consult-${patientId}` : "demo-consult"
  }, [search, patientId])

  if (!mounted) return null

  if (!patient) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-semibold">Không tìm thấy bệnh nhân</div>
          <button className="mt-4 px-4 py-2 rounded-lg border" type="button" onClick={() => router.push("/doctor/patients")}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">{patient.name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Hồ sơ bệnh nhân (demo)</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2"
            onClick={() => router.push(`/tu-van?id=${encodeURIComponent(conversationId)}`)}
          >
            <MessageSquare size={18} />
            Mở tư vấn
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2"
            onClick={() => router.push(`/doctor/reports/new?patientId=${patient.id}`)}
          >
            <FileText size={18} />
            Tạo báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-slate-700 dark:text-slate-300" />
              <div className="text-lg font-bold text-slate-900 dark:text-slate-50">Tổng quan</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-slate-600 dark:text-slate-400">Tuổi</div>
                <div className="text-slate-900 dark:text-slate-50 font-semibold">{patient.age}</div>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-slate-600 dark:text-slate-400">Tình trạng</div>
                <div className="text-slate-900 dark:text-slate-50 font-semibold">{patient.status}</div>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-slate-600 dark:text-slate-400">Số phiên tư vấn</div>
                <div className="text-slate-900 dark:text-slate-50 font-semibold">{patient.sessions}</div>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-slate-600 dark:text-slate-400">Vấn đề chính</div>
                <div className="text-slate-900 dark:text-slate-50 font-semibold">{patient.primaryConcern}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Lịch sử gần đây (demo)</div>
            <div className="space-y-3">
              {[
                { label: "Sàng lọc", detail: "PHQ-9 • Trung bình • 12 điểm", ts: "2024-03-15 20:10" },
                { label: "Trị liệu", detail: "Mood tracker • 3/5", ts: "2024-03-15 21:05" },
                { label: "Nhắc nhở", detail: "Đi bộ 10 phút", ts: "2024-03-16 20:30" },
              ].map((e, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{e.label}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{e.detail}</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{e.ts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Liên hệ</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Phone size={18} />
                {patient.phone}
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Mail size={18} />
                {patient.email}
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Calendar size={18} />
                Lần cuối: {new Date(patient.lastVisit).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Thao tác</div>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => router.push("/doctor/patients")}
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

