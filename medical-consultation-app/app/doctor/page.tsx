'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, FileText, BarChart3, Clock, AlertCircle, TrendingUp } from 'lucide-react'

export default function DoctorDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
    const name = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null
    
    if (!token || role !== 'doctor') {
      router.replace('/login')
      return
    }
    
    setUserName(name || 'Bác sĩ')
  }, [router])

  if (!mounted) return null

  const stats = [
    { icon: Users, label: 'Bệnh nhân', value: '24', color: 'blue' },
    { icon: FileText, label: 'Báo cáo hôm nay', value: '8', color: 'green' },
    { icon: Clock, label: 'Cuộc tư vấn chưa xử lý', value: '5', color: 'orange' },
    { icon: AlertCircle, label: 'Trường hợp khẩn cấp', value: '2', color: 'red' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Chào mừng, {userName}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Quản lý bệnh nhân và theo dõi báo cáo tư vấn
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
            green: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300',
            orange: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
            red: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300',
          }
          
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm hover:shadow-md transition"
            >
              <div className={`w-12 h-12 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                <Icon size={24} />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Consultations */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Tư vấn gần đây</h2>
          <div className="space-y-4">
            {[
              { patient: 'Nguyễn Minh Anh', time: '2 giờ trước', status: 'Đã hoàn tất', type: 'Tâm lý' },
              { patient: 'Trần Linh Đan', time: '4 giờ trước', status: 'Đang xử lý', type: 'Sức khỏe' },
              { patient: 'Phạm Văn A', time: '1 ngày trước', status: 'Chờ xác nhận', type: 'Tâm lý' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{item.patient}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.time}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {item.type}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    item.status === 'Đã hoàn tất' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300' :
                    item.status === 'Đang xử lý' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' :
                    'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-4">Hành động nhanh</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-3 rounded-lg bg-blue-600 dark:bg-blue-600 text-white font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition">
                Xem danh sách bệnh nhân
              </button>
              <button className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Viết báo cáo
              </button>
              <button className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Xem thống kê
              </button>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-50">Hiệu suất</h3>
              <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Tỷ lệ hoàn tất</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">92%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Hài lòng bệnh nhân</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">4.8/5</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
