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
      className="group relative flex flex-col h-full p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl dark:hover:shadow-xl transition-all duration-300 hover:shadow-blue-100 dark:hover:shadow-blue-950/20 hover:-translate-y-2 overflow-hidden"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-teal-50/0 group-hover:from-blue-50/50 group-hover:to-teal-50/30 dark:group-hover:from-blue-950/20 dark:group-hover:to-teal-950/10 transition-all duration-300"></div>
      
      <div className="relative flex flex-col h-full">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-100 dark:group-hover:from-blue-800/50 dark:group-hover:to-blue-700/40 transition-all duration-300 mb-6 shadow-sm">
          <IconComp size={28} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
        </div>
        
        {/* Content */}
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed flex-grow mb-4">
          {description}
        </p>
        
        {/* Link indicator */}
        <div className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-2 transition-transform">
          Khám phá <span className="ml-2">→</span>
        </div>
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
      className="group flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-700/30 hover:from-blue-100 hover:to-blue-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200 hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-100 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/50 transition-all">
        <IconComp size={24} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-grow">
        <div className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>
      </div>
      <div className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">→</div>
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex flex-col text-slate-900 dark:text-slate-50" suppressHydrationWarning>
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Hero Content */}
              <div className="space-y-10">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-2.5 rounded-full border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 mr-2.5 animate-pulse"></span>
                  Công nghệ AI tiên tiến
                </div>

                {/* Heading */}
                <div>
                  <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-balance mb-8">
                    Trợ lý Y tế <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 bg-clip-text text-transparent">Cá nhân hóa</span>
                  </h1>
                  <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                    Hệ thống tư vấn sức khỏe thông minh với AI, hỗ trợ sàng lọc tâm lý, tra cứu thông tin y dược và theo dõi sức khỏe toàn diện.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Link
                    href="/tu-van"
                    className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <Stethoscope size={22} className="relative" />
                    <span className="relative">Bắt đầu Tư vấn</span>
                  </Link>
                  <Link
                    href="/tam-su"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-50 font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all duration-300"
                  >
                    <Heart size={22} />
                    <span>Tâm sự</span>
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-200 dark:border-slate-800">
                  <div className="group">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">24/7</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Hỗ trợ liên tục</div>
                  </div>
                  <div className="group">
                    <div className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent mb-2">100%</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Bảo mật dữ liệu</div>
                  </div>
                  <div className="group">
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent mb-2">10k+</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Người dùng</div>
                  </div>
                </div>
              </div>

              {/* Hero Illustration */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-teal-400/20 dark:from-blue-500/10 dark:to-teal-500/10 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl dark:shadow-xl backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0 text-lg">👤</div>
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 flex-grow border border-slate-200 dark:border-slate-600">
                        Tôi cảm thấy căng thẳng suốt ngày
                      </div>
                    </div>
                    <div className="flex gap-4 flex-row-reverse items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-lg">AI</div>
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 p-4 rounded-xl text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex-grow">
                        Hãy thử bài đánh giá GAD-7 để hiểu rõ hơn về tình trạng lo âu của bạn
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0 text-lg">👤</div>
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 flex-grow border border-slate-200 dark:border-slate-600">
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
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-5xl lg:text-6xl font-bold tracking-tight">
                Tính năng <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">chính</span>
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Tất cả những gì bạn cần để chăm sóc sức khỏe toàn diện với công nghệ AI hàng đầu
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                title="Tư vấn AI"
                description="Chat trực tiếp với trợ lý thông minh để nhận lời khuyên sức khỏe chuyên nghiệp"
                icon={Stethoscope}
                link="/tu-van"
              />
              <FeatureCard 
                title="Tâm sự"
                description="Đối thoại thân thiết với AI companion để nói chuyện và thả lỏng tâm trí"
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
                icon={Activity}
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
