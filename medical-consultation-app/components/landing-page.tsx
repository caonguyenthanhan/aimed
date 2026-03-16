"use client"

import { useState } from "react"

const Icon = ({ size = 24, className = "", children }: { size?: number; className?: string; children: React.ReactNode }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
)

const BrainCircuit = (props: any) => (
  <Icon {...props}>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M9 13a4.5 4.5 0 0 0 3-4" />
    <path d="M6.003 5.125A3 3 0 0 1 19.528 16.32" />
    <path d="M12 18a4 4 0 0 0 4-3.464 6.5 6.5 0 0 0 2.993-8.03" />
    <path d="M16 5h.01" />
    <path d="M12 18h.01" />
    <path d="M2.5 10a4.5 4.5 0 0 1 7-3" />
    <path d="M14.5 10a4.5 4.5 0 0 1 7-3" />
  </Icon>
)

const Stethoscope = (props: any) => (
  <Icon {...props}>
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </Icon>
)

const MessageSquare = (props: any) => (
  <Icon {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </Icon>
)

const Mic = (props: any) => (
  <Icon {...props}>
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <path d="M12 19v3" />
    <path d="M8 22h8" />
  </Icon>
)

const Terminal = (props: any) => (
  <Icon {...props}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </Icon>
)

const SearchIcon = (props: any) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
)

const Activity = (props: any) => (
  <Icon {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Icon>
)

const Monitor = (props: any) => (
  <Icon {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </Icon>
)

const ChevronRight = (props: any) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
)

const Copy = (props: any) => (
  <Icon {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
)

const Check = (props: any) => (
  <Icon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
)

const Database = (props: any) => (
  <Icon {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Icon>
)

const Server = (props: any) => (
  <Icon {...props}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </Icon>
)

const GraduationCap = (props: any) => (
  <Icon {...props}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </Icon>
)

function CopyBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-950/50">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-sm text-green-400 leading-relaxed whitespace-pre-wrap">{code}</pre>
      </div>
    </div>
  )
}

function FeatureCard({ title, description, icon: IconComp, link, colorClass }: { title: string; description: string; icon: any; link: string; colorClass: string }) {
  return (
    <a href={link} className="group relative block p-6 h-full rounded-2xl backdrop-blur-md bg-white/92 border border-white/20 hover:shadow-[0_0_24px_rgba(255,255,255,0.18)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <IconComp size={100} />
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClass} bg-opacity-20`}>
        <IconComp size={24} className={colorClass.replace('bg-', 'text-')} />
      </div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-4">{description}</p>
      <div className="flex items-center text-sm font-semibold text-blue-400 group-hover:translate-x-2 transition-transform">
        Truy cập ngay <ChevronRight size={16} className="ml-1" />
      </div>
    </a>
  )
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server')
  return (
    <div className="min-h-screen hero-gradient flex flex-col text-slate-800" suppressHydrationWarning>
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-b-slate-200" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center space-x-2">
            <BrainCircuit className="text-blue-500" size={32} />
            <div>
              <h1 className="text-lg font-bold tracking-tight"><span className="text-blue-500">AI</span>Med</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">KLTN 2026</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Tính năng</a>
          </nav>
        </div>
      </header>
      <main className="flex-grow pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2"></span>
                Powered by Llama 3.1 & FastAPI
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                Trợ lý Y tế <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 text-glow">Thông minh</span>
              </h1>
              <p className="text-lg text-slate-300 max-w-xl leading-relaxed">Hệ thống tư vấn sức khỏe ứng dụng mô hình ngôn ngữ lớn (LLM), hỗ trợ sàng lọc tâm lý và tra cứu thông tin y dược chính xác, tin cậy.</p>
              <div className="flex flex-wrap gap-4">
                <a href="/tu-van" className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-105 flex items-center">
                  <Stethoscope className="mr-2" size={20} />
                  Bắt đầu Tư vấn
                </a>
                <a href="/tam-su" className="px-6 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 transition-all hover:scale-105 flex items-center">
                  <MessageSquare className="mr-2" size={20} />
                  Tâm sự
                </a>
                <a href="/speech-chat" className="px-6 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 transition-all hover:scale-105 flex items-center">
                  <Mic className="mr-2" size={20} />
                  Stream
                </a>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-blue-500 blur-[100px] opacity-20 rounded-full"></div>
            <div className="relative glass-panel rounded-2xl p-6 border border-slate-200 shadow-2xl rotate-1">
                <div className="flex items-center space-x-2 mb-4 border-b border-white/10 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="ml-4 px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono w-full text-center">Llama-3.1-Medical-Assistant</div>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center">You</div>
                    <div className="bg-slate-100 p-3 rounded-r-lg rounded-bl-lg text-slate-700">Tôi cảm thấy mệt mỏi và mất ngủ kéo dài 2 tuần nay...</div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">AI</div>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-l-lg rounded-br-lg text-blue-700">Dựa trên triệu chứng bạn mô tả, đây có thể là dấu hiệu của căng thẳng hoặc rối loạn lo âu.\n\nTôi khuyên bạn nên làm bài Sàng lọc tâm lý (PHQ-9) để đánh giá chi tiết hơn.</div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center text-green-600"><Activity size={16} className="mr-2" /><span>Đề xuất: Bài test PHQ-9</span></div>
                    <button className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded">Thực hiện ngay</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="features" className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard title="Trang chủ" description="Tổng quan hệ thống, bảng điều khiển và lối tắt truy cập nhanh." icon={Monitor} link="/" colorClass="text-slate-400" />
            <FeatureCard title="Tư vấn AI" description="Trò chuyện trực tiếp với trợ lý ảo để nhận lời khuyên sức khỏe." icon={Stethoscope} link="/tu-van" colorClass="text-blue-500" />
            <FeatureCard title="Tra cứu Y dược" description="Tìm kiếm thông tin thuốc, bệnh lý từ cơ sở dữ liệu chuẩn hóa." icon={SearchIcon} link="/tra-cuu" colorClass="text-teal-400" />
            <FeatureCard title="Sàng lọc Tâm lý" description="Thực hiện các bài test (PHQ-9, GAD-7) để đánh giá tinh thần." icon={Activity} link="/sang-loc" colorClass="text-purple-400" />
          </div>
          
        </div>
      </main>
      
    </div>
  )
}
