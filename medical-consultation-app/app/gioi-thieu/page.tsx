'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MessageSquare, 
  Smile, 
  Search, 
  Activity, 
  BookOpenText, 
  Bell, 
  Newspaper,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Zap
} from 'lucide-react'

export default function IntroductionPage() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  const features = [
    {
      id: 'tu-van',
      name: 'Tư vấn',
      icon: MessageSquare,
      shortDesc: 'Giao tiếp với bác sĩ',
      fullDesc: 'Nhận tư vấn y tế trực tiếp từ các bác sĩ chuyên nghiệp. Đặt câu hỏi, mô tả triệu chứng và nhận lời khuyên y tế từ chuyên gia.',
      benefits: [
        'Tư vấn từ bác sĩ chuyên môn',
        'Phản hồi nhanh chóng',
        'Bảo mật thông tin cá nhân',
        'Có thể yêu cầu tái tư vấn'
      ],
      howToUse: [
        'Nhấp vào "Tư vấn" từ menu chính',
        'Chọn loại tư vấn bạn cần',
        'Mô tả chi tiết triệu chứng và tình trạng sức khỏe',
        'Chờ bác sĩ phản hồi và nhận lời khuyên'
      ],
      link: '/tu-van',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      id: 'tam-su',
      name: 'Tâm sự',
      icon: Smile,
      shortDesc: 'Trò chuyện bằng giọng nói',
      fullDesc: 'Trao đổi tự do bằng giọng nói hoặc văn bản với trợ lý AI thân thiện. Nói về những lo lắng, stress, hoặc bất kỳ điều gì bạn muốn chia sẻ.',
      benefits: [
        'Trò chuyện bằng giọng nói tự nhiên',
        'Luôn sẵn sàng 24/7',
        'Không cần lo sợ bị phán xét',
        'Hỗ trợ tâm lý ban đầu'
      ],
      howToUse: [
        'Chọn "Tâm sự" từ menu',
        'Chọn giữa chat hoặc voice call',
        'Bắt đầu trò chuyện với AI',
        'AI sẽ lắng nghe và cung cấp hỗ trợ tâm lý'
      ],
      link: '/tam-su',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    },
    {
      id: 'tra-cuu',
      name: 'Tra cứu',
      icon: Search,
      shortDesc: 'Tìm kiếm thông tin y tế',
      fullDesc: 'Tìm kiếm thông tin chi tiết về bệnh, triệu chứng, thuốc men và các vấn đề sức khỏe. Dữ liệu được cập nhật từ các nguồn y tế đáng tin cậy.',
      benefits: [
        'Thông tin y tế toàn diện',
        'Tìm kiếm nhanh chóng',
        'Danh sách bệnh và thuốc chi tiết',
        'Dễ hiểu cho người không chuyên'
      ],
      howToUse: [
        'Truy cập "Tra cứu" từ menu công cụ',
        'Nhập tên bệnh, triệu chứng hoặc tên thuốc',
        'Xem kết quả chi tiết',
        'Tìm hiểu thêm hoặc liên hệ bác sĩ nếu cần'
      ],
      link: '/tra-cuu',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
      id: 'sang-loc',
      name: 'Sàng lọc',
      icon: Activity,
      shortDesc: 'Kiểm tra sức khỏe tâm lý',
      fullDesc: 'Thực hiện các bài kiểm tra sàng lọc tâm lý chuẩn (PHQ-9, GAD-7, PCL-5) để đánh giá trạng thái sức khỏe tinh thần của bạn.',
      benefits: [
        'Kiểm tra chuẩn y tế',
        'Nhận điểm số chi tiết',
        'So sánh với tiêu chuẩn',
        'Gợi ý hành động tiếp theo'
      ],
      howToUse: [
        'Chọn "Sàng lọc" từ công cụ',
        'Chọn loại bài kiểm tra (PHQ-9, GAD-7, hoặc PCL-5)',
        'Trả lời các câu hỏi trung thực',
        'Nhận điểm số và khuyến nghị từ bác sĩ'
      ],
      link: '/sang-loc',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30'
    },
    {
      id: 'tri-lieu',
      name: 'Trị liệu',
      icon: BookOpenText,
      shortDesc: 'Chương trình liệu pháp',
      fullDesc: 'Truy cập các chương trình trị liệu được thiết kế cá nhân dựa trên tình trạng sức khỏe của bạn. Bao gồm bài tập, kỹ thuật thư giãn và hướng dẫn từng bước.',
      benefits: [
        'Chương trình cá nhân hóa',
        'Hướng dẫn chi tiết',
        'Theo dõi tiến độ',
        'Kết nối với bác sĩ nếu cần'
      ],
      howToUse: [
        'Mở "Trị liệu" từ công cụ',
        'Chọn chương trình phù hợp với tình trạng của bạn',
        'Thực hiện bài tập hoặc kỹ thuật được hướng dẫn',
        'Theo dõi tiến độ và điều chỉnh nếu cần'
      ],
      link: '/tri-lieu',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/30'
    },
    {
      id: 'nhac-nho',
      name: 'Nhắc nhở',
      icon: Bell,
      shortDesc: 'Lịch uống thuốc & sự kiện',
      fullDesc: 'Nhận nhắc nhở về lịch uống thuốc, tái khám với bác sĩ, và các sự kiện chăm sóc sức khỏe quan trọng khác.',
      benefits: [
        'Không bỏ lỡ liều thuốc',
        'Nhắc nhở tái khám',
        'Thông báo đẩy định kỳ',
        'Quản lý lịch trình sức khỏe'
      ],
      howToUse: [
        'Truy cập "Nhắc nhở"',
        'Thêm lịch uống thuốc hoặc cuộc hẹn',
        'Chọn tần suất nhắc nhở',
        'Nhận thông báo tự động trên điện thoại'
      ],
      link: '/nhac-nho',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30'
    },
    {
      id: 'tin-tuc',
      name: 'Tin tức y khoa',
      icon: Newspaper,
      shortDesc: 'Cập nhật sức khỏe',
      fullDesc: 'Đọc các bài viết y khoa mới nhất, nghiên cứu y tế, lời khuyên sức khỏe từ các chuyên gia uy tín.',
      benefits: [
        'Thông tin y khoa mới nhất',
        'Từ các chuyên gia uy tín',
        'Dễ hiểu cho mọi người',
        'Cập nhật thường xuyên'
      ],
      howToUse: [
        'Chọn "Tin tức" từ công cụ',
        'Duyệt qua các bài viết mới nhất',
        'Đọc toàn bộ bài hoặc tóm tắt',
        'Lưu bài yêu thích để đọc sau'
      ],
      link: '/tin-tuc-y-khoa',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30'
    }
  ]

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white dark:bg-slate-950 hero-gradient dark:hero-gradient-dark">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Hướng dẫn Sử dụng Các Tính Năng
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Khám phá chi tiết cách sử dụng từng tính năng để chăm sóc sức khỏe tốt hơn
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {selectedFeature ? (
          // Feature Detail View
          <div className="animate-in fade-in duration-300">
            <button
              onClick={() => setSelectedFeature(null)}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 font-semibold transition"
            >
              <ArrowLeft size={20} />
              Quay lại
            </button>

            {features.map(feature => {
              if (feature.id !== selectedFeature) return null
              const IconComponent = feature.icon
              return (
                <div key={feature.id} className="space-y-8">
                  {/* Hero Section */}
                  <div className={`bg-gradient-to-r ${feature.color} rounded-2xl p-8 sm:p-12 text-white`}>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent size={32} />
                      </div>
                      <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{feature.name}</h1>
                        <p className="text-lg text-white/90">{feature.shortDesc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                        Mô tả chi tiết
                      </h2>
                      <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                        {feature.fullDesc}
                      </p>
                    </div>

                    {/* Benefits */}
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                        Lợi ích chính
                      </h2>
                      <div className="space-y-3">
                        {feature.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* How to Use */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">
                      Cách sử dụng từng bước
                    </h2>
                    <div className="space-y-4">
                      {feature.howToUse.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="pt-1">
                            <p className="text-slate-700 dark:text-slate-300">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="flex gap-4">
                    <Link
                      href={feature.link}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition"
                    >
                      Truy cập {feature.name}
                      <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Features Grid View
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-8">
              Chọn một tính năng để khám phá chi tiết
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(feature => {
                const IconComponent = feature.icon
                return (
                  <button
                    key={feature.id}
                    onClick={() => setSelectedFeature(feature.id)}
                    className={`text-left p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 group`}
                  >
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <IconComponent className={`w-6 h-6 text-blue-600 dark:text-blue-400`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                      {feature.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      {feature.shortDesc}
                    </p>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm group-hover:gap-3 transition-all">
                      Khám phá
                      <ArrowRight size={16} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Tips Section */}
            <div className="mt-16 grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-2">Mẹo sử dụng hiệu quả</h3>
                    <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-sm">
                      <li>• Khám phá từng tính năng khi bạn cần</li>
                      <li>• Được phép liên hệ bác sĩ nếu có thắc mắc</li>
                      <li>• Thông tin của bạn luôn được bảo mật</li>
                      <li>• Sử dụng thường xuyên để theo dõi sức khỏe</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-2">Bắt đầu ngay</h3>
                    <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-sm">
                      <li>• Tạo tài khoản và cập nhật hồ sơ</li>
                      <li>• Bắt đầu với "Tâm sự" hoặc "Tra cứu"</li>
                      <li>• Đặt lịch tư vấn với bác sĩ</li>
                      <li>• Theo dõi sức khỏe định kỳ</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
