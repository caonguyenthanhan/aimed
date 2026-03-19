'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Stethoscope, BarChart3, CheckCircle, ArrowRight, MessageSquare, Search, Activity, BookOpenText, Bell, Newspaper, FileText } from 'lucide-react'

export default function IntroductionPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'patient' | 'doctor'>('overview')

  const commonFeatures = [
    { icon: Search, title: 'Tra Cứu', desc: 'Tìm kiếm thông tin bệnh lý và thuốc men' },
    { icon: Activity, title: 'Sàng Lọc', desc: 'Bài kiểm tra tâm lý (PHQ-9, GAD-7, PCL-5)' },
    { icon: BookOpenText, title: 'Trị Liệu', desc: 'Hướng dẫn liệu pháp và chăm sóc' },
    { icon: Bell, title: 'Nhắc Nhở', desc: 'Quản lý sự kiện sức khỏe cá nhân' },
    { icon: Newspaper, title: 'Tin Tức', desc: 'Cập nhật tin tức y khoa hàng ngày' },
  ]

  const patientFeatures = [
    { icon: MessageSquare, title: 'Tư Vấn', desc: 'Giao tiếp với bác sĩ/trợ lý y tế qua chat' },
    { icon: Users, title: 'Tâm Sự', desc: 'Trò chuyện với chatbot đồng hành' },
    ...commonFeatures
  ]

  const doctorFeatures = [
    { icon: BarChart3, title: 'Bảng Điều Khiển', desc: 'Tổng quan thống kê bệnh nhân' },
    { icon: Users, title: 'Quản Lý Bệnh Nhân', desc: 'Danh sách và hồ sơ bệnh nhân' },
    { icon: FileText, title: 'Báo Cáo', desc: 'Báo cáo tháng, quý, năm và xuất dữ liệu' },
    ...commonFeatures
  ]

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white dark:bg-slate-950 hero-gradient dark:hero-gradient-dark">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Giới Thiệu AIMED
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Ứng dụng tư vấn y tế thông minh với AI. Được thiết kế cho bác sĩ và bệnh nhân với các tính năng riêng biệt
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-12 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-4 font-semibold transition-all border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">📋 </span>Tổng Quan
          </button>
          <button
            onClick={() => setActiveTab('patient')}
            className={`flex-1 px-6 py-4 font-semibold transition-all border-b-2 ${
              activeTab === 'patient'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">👤 </span>Người Dùng
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 px-6 py-4 font-semibold transition-all border-b-2 ${
              activeTab === 'doctor'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">👨‍⚕️ </span>Bác Sĩ
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-12 pb-12">
            {/* Account Types Overview */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8">
                Hai Loại Tài Khoản Chính
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Patient Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                    Tài Khoản Người Dùng
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Dành cho những người muốn tìm kiếm thông tin sức khỏe, tư vấn với bác sĩ, và sàng lọc tâm lý
                  </p>
                  <div className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Tư vấn với chuyên gia y tế
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Trò chuyện với chatbot đồng hành
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Tra cứu thông tin y tế
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Sàng lọc tâm lý
                    </div>
                  </div>
                  <Link href="/login" className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold hover:underline">
                    Tìm hiểu thêm <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Doctor Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 hover:shadow-lg transition">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center mb-4">
                    <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                    Tài Khoản Bác Sĩ
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Dành cho chuyên gia y tế quản lý bệnh nhân, xem báo cáo và phân tích dữ liệu
                  </p>
                  <div className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Bảng điều khiển quản lý
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Quản lý danh sách bệnh nhân
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Báo cáo chi tiết
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Xuất dữ liệu PDF/Excel
                    </div>
                  </div>
                  <Link href="/login" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Tìm hiểu thêm <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Shared Features */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8">
                Tính Năng Chung Cho Cả Hai
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {commonFeatures.map((feature) => (
                  <div key={feature.title} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{feature.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patient Tab */}
        {activeTab === 'patient' && (
          <div className="pb-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Tài Khoản Người Dùng
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Trang chủ cho tất cả những ai tìm kiếm tư vấn sức khỏe, thông tin y tế và hỗ trợ cảm xúc
              </p>
            </div>

            {/* Test Accounts */}
            <div className="mb-12 p-6 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-900 dark:text-green-200 mb-4">Tài Khoản Test Sẵn Có</h3>
              <div className="space-y-3 text-sm text-green-800 dark:text-green-300">
                <div>
                  <strong>Nguyễn Minh Anh</strong> (28 tuổi)<br />
                  <code className="text-xs">patient.minh / Demo123!</code>
                </div>
                <div>
                  <strong>Trần Linh Đan</strong> (25 tuổi)<br />
                  <code className="text-xs">patient.linh / Demo123!</code>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-6">
              {patientFeatures.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition">
                Đăng Nhập Hoặc Tạo Tài Khoản <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Doctor Tab */}
        {activeTab === 'doctor' && (
          <div className="pb-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Tài Khoản Bác Sĩ
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Công cụ quản lý bệnh nhân toàn diện dành cho chuyên gia y tế với báo cáo chi tiết và phân tích dữ liệu
              </p>
            </div>

            {/* Test Accounts */}
            <div className="mb-12 p-6 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-4">Tài Khoản Test Sẵn Có</h3>
              <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                <div>
                  <strong>Dr. Tuấn Anh</strong> (Tâm lý học)<br />
                  <code className="text-xs">doctor.tuan / Demo123!</code>
                </div>
                <div>
                  <strong>Dr. Linh Phương</strong> (Sức khỏe tâm thần)<br />
                  <code className="text-xs">doctor.linh / Demo123!</code>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-6">
              {doctorFeatures.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Dashboard Preview */}
            <div className="mt-12 p-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                Bảng Điều Khiển Bác Sĩ
              </h3>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Khi đăng nhập với tài khoản bác sĩ, bạn sẽ được chuyển hướng đến bảng điều khiển với:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Thống kê tổng quát: số bệnh nhân, báo cáo, cuộc tư vấn chưa xử lý</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Danh sách cuộc tư vấn gần đây với bệnh nhân</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Quản lý toàn bộ hồ sơ bệnh nhân</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Báo cáo theo tháng, quý, năm</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition">
                Đăng Nhập Với Tài Khoản Bác Sĩ <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-16 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-b from-transparent to-blue-50 dark:to-blue-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Sẵn Sàng Bắt Đầu?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Chọn tài khoản phù hợp và truy cập các tính năng được thiết kế riêng cho bạn
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-3 bg-blue-600 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition">
              Đăng Nhập
            </Link>
            <Link href="/" className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition">
              Quay Lại Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
