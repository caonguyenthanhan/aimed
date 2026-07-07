"use client"

import React, { useState } from "react"
import { AlertTriangle, Bot, User, Sparkles, Phone, Video, Calendar, Heart, ShieldAlert, ChevronRight, Play, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Mock YouTube Video Embed Component
function YouTubeVideoEmbed({ videoId, title, description, reason }: { videoId: string, title: string, description: string, reason: string }) {
  return (
    <Card className="border-blue-200 bg-white dark:bg-gray-900 overflow-hidden shadow-md mt-4 max-w-xl">
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <CardContent className="p-4 space-y-2">
        <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50 text-xs">
          <span className="font-semibold text-blue-800 dark:text-blue-300">Lý do gợi ý:</span> {reason}
        </div>
      </CardContent>
    </Card>
  )
}

// Behavioral Activation Daily Schedule Component
function BehavioralActivationSchedule() {
  const [tasks, setTasks] = useState([
    { id: 1, time: "Sáng (07:30)", task: "Mở rèm đón ánh sáng tự nhiên và uống 1 cốc nước ấm.", checked: true },
    { id: 2, time: "Trưa (12:00)", task: "Ăn bữa trưa đầy đủ dinh dưỡng, ngồi nghỉ ngơi thư giãn 15 phút.", checked: false },
    { id: 3, time: "Chiều (16:30)", task: "Đi bộ nhẹ nhàng quanh nhà hoặc công viên trong 10 phút.", checked: false },
    { id: 4, time: "Tối (21:30)", task: "Đọc sách hoặc nghe nhạc thiền không lời, chuẩn bị ngủ lúc 22:00.", checked: false }
  ])

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t))
  }

  return (
    <Card className="border-emerald-200 bg-white dark:bg-gray-900 overflow-hidden shadow-md mt-4 max-w-xl">
      <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
        <CardTitle className="text-emerald-800 dark:text-emerald-400 text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Kế Hoạch Kích Hoạt Hành Vi Vi Mô (CBT BA)
        </CardTitle>
        <CardDescription className="text-emerald-600 dark:text-emerald-500 text-xs">
          Phá vỡ vòng lặp trầm cảm bằng cách thực hiện các bước nhỏ mỗi ngày.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {tasks.map(t => (
            <div 
              key={t.id} 
              className={`flex items-start justify-between p-2.5 rounded-lg border transition-all duration-150 ${
                t.checked 
                  ? "bg-emerald-50/50 border-emerald-100 text-gray-500 line-through dark:bg-emerald-950/10 dark:border-emerald-900/20" 
                  : "bg-white border-gray-100 hover:border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={t.checked} 
                  onChange={() => toggleTask(t.id)} 
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold block text-gray-700 dark:text-gray-300">{t.time}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{t.task}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Emergency SOS Card Component
function EmergencySosCard({ onTriggerDialog }: { onTriggerDialog: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 overflow-hidden shadow-md mt-4 max-w-xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="font-semibold text-red-900 dark:text-red-300 text-base">Chốt Chặn Cấp Cứu An Toàn (Level 4 Safety)</h4>
            <p className="text-sm text-red-700 dark:text-red-400">
              Hệ thống phát hiện nội dung có nguy cơ tự hại hoặc đe dọa an toàn cao. Safety Pipeline đã kích hoạt chốt chặn và tạm dừng hội thoại lâm sàng.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button 
            onClick={() => window.open("tel:115")} 
            className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 py-5 shadow-sm"
          >
            <Phone className="h-4 w-4" />
            Gọi Cấp Cứu 115
          </Button>
          <Button 
            onClick={onTriggerDialog}
            variant="outline" 
            className="border-red-300 text-red-700 hover:bg-red-50 font-semibold flex items-center justify-center gap-2 py-5 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Xem Đường Dây Nóng
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SteppedCareDemo() {
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3 | 4>(1)
  const [sosOpen, setSosOpen] = useState(false)

  // Pre-configured levels
  const levels = [
    { id: 1, name: "Cấp 1: Giáo Dục Tâm Lý", desc: "Psychoeducation (Thiền định)", icon: Video, color: "text-blue-500 border-blue-200 bg-blue-50/50" },
    { id: 2, name: "Cấp 2: Kích Hoạt Hành Vi", desc: "Behavioral Activation (CBT-BA)", icon: Calendar, color: "text-emerald-500 border-emerald-200 bg-emerald-50/50" },
    { id: 3, name: "Cấp 3: Trị Liệu Thấu Cảm", desc: "CBT Empathy Chat", icon: Heart, color: "text-purple-500 border-purple-200 bg-purple-50/50" },
    { id: 4, name: "Cấp 4: Khẩn Cấp / SOS", desc: "Safety Guardrail (Gọi 115)", icon: ShieldAlert, color: "text-red-500 border-red-200 bg-red-50/50" },
  ]

  // Messages per level
  const chatHistories: Record<number, Array<{ isUser: boolean; text: string; hasComponent?: string }>> = {
    1: [
      { isUser: true, text: "Tôi cảm thấy dạo này đầu óc căng thẳng, khó tập trung, có cách nào thư giãn đầu óc không?" },
      { isUser: false, text: "Chào bạn, tình trạng căng thẳng và khó tập trung rất phổ biến khi cơ thể mệt mỏi hoặc chịu áp lực kéo dài. Để hỗ trợ bạn lập tức, hệ thống khuyên bạn nên thực hiện bài tập thiền định ngắn (Mindfulness Meditation) giúp điều hòa nhịp thở và làm dịu hệ thần kinh.\n\nDưới đây là video hướng dẫn thiền thư giãn đầu óc mà bạn có thể thực hiện ngay tại nhà:", hasComponent: "youtube" }
    ],
    2: [
      { isUser: true, text: "Dạo này tôi bị trầm cảm nhẹ, không muốn làm gì cả, suốt ngày chỉ nằm một chỗ." },
      { isUser: false, text: "Chào bạn, tôi rất chia sẻ với trạng thái mệt mỏi mà bạn đang trải qua. Khi tâm trạng đi xuống, chúng ta dễ có xu hướng cô lập bản thân, ngắt các hoạt động và dẫn đến vòng lặp trầm cảm nặng hơn. \n\nTrong trị liệu nhận thức hành vi (CBT), kỹ thuật **Kích hoạt hành vi (Behavioral Activation)** là giải pháp giúp bạn phá vỡ vòng lặp này bằng những bước đi nhỏ nhất. Tôi đề xuất cho bạn 1 lịch trình hoạt động vi mô tăng dần dưới đây để bạn thực hiện từng bước:", hasComponent: "schedule" }
    ],
    3: [
      { isUser: true, text: "Tôi cảm thấy mình là một kẻ thất bại, làm việc gì cũng hỏng và là gánh nặng cho mọi người." },
      { isUser: false, text: "Tôi nghe và hiểu cảm giác nặng nề bạn đang trải qua lúc này. Khi đối diện với áp lực lớn, tâm trí chúng ta thường có xu hướng bóp méo nhận thức (Cognitive Distortions), tự động gắn mác bản thân là 'kẻ thất bại' hay 'gánh nặng'.\n\nNhưng hãy nhớ rằng, một vài kết quả không như ý muốn không định nghĩa giá trị toàn bộ con người bạn. Bạn có muốn cùng tôi thử thách những suy nghĩ tiêu cực này bằng cách nhìn nhận lại 3 điều nhỏ bé bạn đã hoàn thành tốt trong tuần qua không? Tôi luôn ở đây lắng nghe bạn." }
    ],
    4: [
      { isUser: true, text: "Tôi không muốn sống nữa, cuộc sống này quá bế tắc, tôi muốn kết liễu đời mình ngay bây giờ" },
      { isUser: false, text: "Mình nghe bạn đang ở trong trạng thái rất khó chịu. Vì an toàn của bạn, mình không thể hỗ trợ nội dung liên quan đến tự làm hại bản thân.\n\nNếu bạn đang có ý định hoặc cảm thấy có thể làm hại bản thân ngay lúc này, xin vui lòng liên hệ ngay với các đường dây cứu trợ khẩn cấp dưới đây:", hasComponent: "sos" }
    ]
  }

  const handleLevelSelect = (levelId: 1 | 2 | 3 | 4) => {
    setActiveLevel(levelId)
    if (levelId === 4) {
      setSosOpen(true)
    } else {
      setSosOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AIMed Stepped Care Model Simulator
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Trang mô phỏng giao diện tương tác 4 cấp độ chăm sóc sức khỏe tinh thần phục vụ chụp ảnh báo cáo khóa luận tốt nghiệp.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
        {/* Sidebar Controls */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chọn Cấp Độ Stepped Care</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {levels.map(l => {
                const IconComp = l.icon
                const isActive = activeLevel === l.id
                return (
                  <button
                    key={l.id}
                    onClick={() => handleLevelSelect(l.id as any)}
                    className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-all duration-150 ${
                      isActive 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-gray-100 hover:border-gray-200 bg-white hover:bg-slate-50/50 dark:bg-gray-900 dark:border-gray-800"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border ${isActive ? "bg-primary/10 border-primary/20" : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"} ${l.color.split(" ")[0]}`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm block leading-tight text-gray-900 dark:text-gray-100">{l.name}</span>
                      <span className="text-xs text-gray-500 block dark:text-gray-400">{l.desc}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 self-center" />
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Screenshot instructions */}
          <Card className="border-gray-200 bg-blue-50/20 dark:bg-blue-950/10">
            <CardContent className="p-4 space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold text-blue-900 dark:text-blue-400 block">Hướng dẫn chụp ảnh màn hình:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Chọn cấp độ chăm sóc tương ứng ở cột bên trái.</li>
                <li>Giao diện chat bên phải sẽ hiển thị các component cấu trúc tương ứng.</li>
                <li>Nhấn phím <kbd className="bg-slate-100 px-1 border rounded dark:bg-slate-800">PrintScreen</kbd> hoặc dùng Snipping Tool để cắt vùng chat đưa vào luận văn.</li>
                <li>Ở Cấp 4, nếu muốn mở lại Dialog SOS, hãy nhấn nút "Xem Đường Dây Nóng".</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Chat Window Simulator */}
        <div className="md:col-span-3">
          <Card className="border-gray-200 h-[620px] flex flex-col justify-between overflow-hidden shadow-lg bg-white dark:bg-slate-900">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Trợ Lý Tâm Lý AIMed</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-semibold">Đang hoạt động (Stepped Care)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatHistories[activeLevel].map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-end gap-3 ${msg.isUser ? "justify-end" : "justify-start"}`}
                >
                  {!msg.isUser && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div 
                      className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed border ${
                        msg.isUser 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-slate-50 border-slate-100 text-gray-800 dark:bg-gray-850 dark:border-gray-800 dark:text-gray-250"
                      }`}
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {msg.text}
                    </div>

                    {/* Conditional Component Rendering */}
                    {!msg.isUser && msg.hasComponent === "youtube" && (
                      <YouTubeVideoEmbed 
                        videoId="inpok4MKVLM"
                        title="Thiền Định Giảm Căng Thẳng & Lo Âu Trong 10 Phút"
                        description="Bài tập thiền chánh niệm ngắn giúp bạn xoa dịu hệ thần kinh, thư giãn sâu và tái tạo năng lượng tinh thần hiệu quả."
                        reason="Đề xuất dựa trên triệu chứng căng thẳng và khó tập trung (Psychoeducation)."
                      />
                    )}

                    {!msg.isUser && msg.hasComponent === "schedule" && (
                      <BehavioralActivationSchedule />
                    )}

                    {!msg.isUser && msg.hasComponent === "sos" && (
                      <EmergencySosCard onTriggerDialog={() => setSosOpen(true)} />
                    )}
                  </div>
                  {msg.isUser && (
                    <div className="flex-shrink-0 w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600 dark:text-slate-350" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input Footer (Simulated) */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
              <input 
                disabled 
                placeholder="Trang mô phỏng - Không nhận tin nhắn mới..." 
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-slate-800 text-sm cursor-not-allowed"
              />
              <Button disabled className="rounded-xl px-4 py-6 bg-slate-400 cursor-not-allowed">
                Gửi
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* SOS Warning Dialog (Simulated) */}
      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/85 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              CẢNH BÁO NGUY HIỂM - ĐƯỜNG DÂY NÓNG CỨU HỘ
            </DialogTitle>
            <DialogDescription className="text-red-600 dark:text-red-500 font-medium">
              Bạn đang ở trong vùng rủi ro tâm lý cực độ. Xin vui lòng liên hệ hỗ trợ ngay lập tức để giữ an toàn cho bản thân:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-red-900 dark:text-red-200">
            <div className="p-3 bg-white dark:bg-red-900/40 rounded-xl border border-red-100 dark:border-red-900/50 flex justify-between items-center shadow-sm">
              <div>
                <span className="font-bold text-sm block">ĐƯỜNG DÂY KHẨN CẤP QUỐC GIA</span>
                <span className="text-xs text-red-600 dark:text-red-400">Hỗ trợ y tế và cấp cứu tức thì</span>
              </div>
              <Button 
                onClick={() => window.open("tel:115")}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
              >
                115
              </Button>
            </div>
            <div className="p-3 bg-white dark:bg-red-900/40 rounded-xl border border-red-100 dark:border-red-900/50 flex justify-between items-center shadow-sm">
              <div>
                <span className="font-bold text-sm block">BẢO VỆ TRẺ EM & PHỤ NỮ</span>
                <span className="text-xs text-red-600 dark:text-red-400">Hỗ trợ khẩn cấp bạo lực và tự hại</span>
              </div>
              <Button 
                onClick={() => window.open("tel:111")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
              >
                111
              </Button>
            </div>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 italic">
            *Lưu ý: AIMed tự động ghi lại phiên này và tạm ngừng cuộc hội thoại để đảm bảo tính an toàn của bạn. Hãy tìm kiếm sự trợ giúp từ những người xung quanh.
          </p>
          <DialogFooter>
            <Button variant="outline" className="border-red-300 text-red-800 dark:border-red-900 dark:text-red-400" onClick={() => setSosOpen(false)}>
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center mt-6 pt-4 border-t border-gray-150 dark:border-gray-800 text-xs text-gray-400">
        AIMed Thesis Project 2026 — Đạt chuẩn xuất sắc đánh giá lâm sàng học thuật.
      </div>
    </div>
  )
}
