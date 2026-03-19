"use client"

import Link from "next/link"
import { 
  Stethoscope, 
  MessageSquare, 
  Search, 
  Activity, 
  Newspaper, 
  Smile, 
  Bell, 
  BookOpenText,
  Heart,
  Brain,
  Zap,
  ShieldCheck
} from "lucide-react"

function FeatureCard({ 
  title, 
  description, 
  icon: IconComp, 
  link 
}: { 
  title: string
  description: string
  icon: any
  link: string
}) {
  return (
    <Link 
      href={link} 
      className="group relative flex flex-col p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 hover:shadow-blue-100 dark:hover:shadow-blue-950/50 hover:-translate-y-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
          <IconComp size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed flex-grow mb-4">{description}</p>
      <div className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
        Khám phá →
      </div>
    </Link>
  )
}

function QuickAccessCard({
  title,
  subtitle,
  icon: IconComp,
  link
}: {
  title: string
  subtitle: string
  icon: any
  link: string
}) {
  return (
    <Link
      href={link}
      className="flex items-center gap-3 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
        <IconComp size={20} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-grow">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
      </div>
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-50" suppressHydrationWarning>
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Content */}
              <div className="space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mr-2"></span>
                  Công nghệ AI tiên tiến
                </div>

                {/* Heading */}
                <div>
                  <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-balance mb-6">
                    Trợ lý Y tế <span className="text-blue-600 dark:text-blue-400">Cá nhân hóa</span>
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    Hệ thống tư vấn sức khỏe thông minh với AI, hỗ trợ sàng lọc tâm lý, tra cứu thông tin y dược và theo dõi sức khỏe toàn diện.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link
                    href="/tu-van"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    <Stethoscope size={20} />
                    <span>Bắt đầu Tư vấn</span>
                  </Link>
                  <Link
                    href="/tam-su"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-semibold border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    <Heart size={20} />
                    <span>Tâm sự</span>
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Hỗ trợ liên tục</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-500 dark:text-teal-400">100%</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Bảo mật dữ liệu</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">10k+</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Người dùng</div>
                  </div>
                </div>
              </div>

              {/* Hero Illustration */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 to-teal-200/30 dark:from-blue-500/10 dark:to-teal-500/10 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">👤</div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 flex-grow">
                        Tôi cảm thấy căng thẳng suốt ngày
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">AI</div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex-grow">
                        Có thể bạn nên thử bài đánh giá GAD-7
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">👤</div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 flex-grow">
                        Tôi muốn làm bài test
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Tính năng chính
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Tất cả những gì bạn cần để chăm sóc sức khỏe toàn diện
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                title="Tư vấn AI"
                description="Chat trực tiếp với trợ lý thông minh để nhận lời khuyên sức khỏe"
                icon={Stethoscope}
                link="/tu-van"
              />
              <FeatureCard 
                title="Tâm sự"
                description="Đối thoại thân thiết với AI companion để nói chuyện và thả lỏng"
                icon={MessageSquare}
                link="/tam-su"
              />
              <FeatureCard 
                title="Tra cứu Y dược"
                description="Tìm kiếm thông tin chi tiết về thuốc, bệnh lý từ cơ sở dữ liệu tin cậy"
                icon={Search}
                link="/tra-cuu"
              />
              <FeatureCard 
                title="Sàng lọc Tâm lý"
                description="Thực hiện các bài test (PHQ-9, GAD-7) để đánh giá sức khỏe tinh thần"
                icon={Brain}
                link="/sang-loc"
              />
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Truy cập nhanh</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Khám phá tất cả các tính năng có sẵn</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAccessCard
                title="Tư vấn"
                subtitle="Chat y tế"
                icon={Stethoscope}
                link="/tu-van"
              />
              <QuickAccessCard
                title="Tâm sự"
                subtitle="Companion"
                icon={Smile}
                link="/tam-su"
              />
              <QuickAccessCard
                title="Tra cứu"
                subtitle="Thuốc & Bệnh"
                icon={Search}
                link="/tra-cuu"
              />
              <QuickAccessCard
                title="Sàng lọc"
                subtitle="Sức khỏe tâm lý"
                icon={Activity}
                link="/sang-loc"
              />
              <QuickAccessCard
                title="Trị liệu"
                subtitle="Mood tracking"
                icon={BookOpenText}
                link="/tri-lieu"
              />
              <QuickAccessCard
                title="Nhắc nhở"
                subtitle="Quản lý thói quen"
                icon={Bell}
                link="/nhac-nho"
              />
              <QuickAccessCard
                title="Tin tức"
                subtitle="Y khoa"
                icon={Newspaper}
                link="/tin-tuc-y-khoa"
              />
              <QuickAccessCard
                title="Tài khoản"
                subtitle="Profile"
                icon={ShieldCheck}
                link="/account"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/20 dark:to-teal-950/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-6">
              Bắt đầu chăm sóc sức khỏe ngay hôm nay
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Tham gia hàng ngàn người dùng đang sử dụng AI Med để quản lý sức khỏe của họ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tu-van"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Zap size={20} />
                Khám phá ngay
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-semibold border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                Tài khoản của tôi
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
