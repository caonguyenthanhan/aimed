'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Phone, Mail, Calendar, FileText } from 'lucide-react'
import { demoPatients } from "@/lib/doctor-demo"

export default function DoctorPatientsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
    
    if (!token || role !== 'doctor') {
      router.replace('/login')
      return
    }
  }, [router])

  if (!mounted) return null

  const filteredPatients = demoPatients
    .filter((p) => (!activeOnly ? true : p.status === "Hoạt động"))
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Danh sách bệnh nhân
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Quản lý và theo dõi bệnh nhân của bạn
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm bệnh nhân..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={() => setActiveOnly((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Filter size={18} />
          {activeOnly ? "Chỉ hoạt động" : "Tất cả"}
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-50">Bệnh nhân</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-50 hidden sm:table-cell">Liên hệ</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-50 hidden md:table-cell">Lần cuối</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-50 hidden lg:table-cell">Tình trạng</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-50">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-50">{patient.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tuổi: {patient.age}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Phone size={16} />
                        {patient.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Mail size={16} />
                        {patient.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar size={16} />
                      {new Date(patient.lastVisit).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      patient.status === 'Hoạt động'
                        ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                      className="text-sm px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-950/50 transition"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Không tìm thấy bệnh nhân nào</p>
        </div>
      )}
    </div>
  )
}
