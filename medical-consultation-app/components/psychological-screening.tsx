"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, CheckCircle, AlertCircle, Info, MessageCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AiChatBox } from "./ai-chat-box"
import dynamic from "next/dynamic"

const PDFReportGenerator = dynamic(() => import("./pdf-report-generator").then(mod => ({ default: mod.PDFReportGenerator })), {
  ssr: false,
  loading: () => <div className="p-4 text-slate-600">Đang tải...</div>
})

interface Question {
  id: string
  text: string
  options: { value: string; label: string; score: number }[]
}

interface Assessment {
  id: string
  title: string
  description: string
  questions: Question[]
  interpretation: { min: number; max: number; level: string; description: string; recommendations: string[] }[]
}

const phq9Assessment: Assessment = {
  id: "phq9",
  title: "PHQ-9 - Sàng lọc Trầm cảm",
  description: "Bộ câu hỏi chuẩn để đánh giá mức độ trầm cảm trong 2 tuần qua",
  questions: [
    {
      id: "phq9-1",
      text: "Ít hứng thú hoặc không thấy vui vẻ khi làm mọi việc",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-2",
      text: "Cảm thấy buồn bã, chán nản, hoặc vô vọng",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-3",
      text: "Khó đi vào giấc ngủ, ngủ không yên giấc, hoặc ngủ quá nhiều",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-4",
      text: "Cảm thấy mệt mỏi hoặc không có năng lượng",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-5",
      text: "Ăn không ngon hoặc ăn quá nhiều",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-6",
      text: "Cảm thấy tồi tệ về bản thân, cho rằng mình là người thất bại hoặc đã làm gia đình và bản thân thất vọng",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-7",
      text: "Khó tập trung vào việc gì đó, ví dụ như đọc báo hoặc xem TV",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-8",
      text: "Di chuyển hoặc nói chuyện chậm chạp đến mức người khác có thể nhận thấy? Hoặc ngược lại, bồn chồn, đứng ngồi không yên hơn bình thường",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "phq9-9",
      text: "Có suy nghĩ rằng bản thân nên chết đi hoặc có ý muốn tự làm hại mình",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 4,
      level: "Tối thiểu",
      description: "Mức độ trầm cảm tối thiểu hoặc không có",
      recommendations: ["Duy trì lối sống lành mạnh", "Tập thể dục thường xuyên", "Ngủ đủ giấc 7-8 tiếng/đêm"],
    },
    {
      min: 5,
      max: 9,
      level: "Nhẹ",
      description: "Mức độ trầm cảm nhẹ",
      recommendations: ["Thực hành thiền định, yoga", "Tăng cường hoạt động xã hội", "Theo dõi tâm trạng hàng ngày"],
    },
    {
      min: 10,
      max: 14,
      level: "Trung bình",
      description: "Mức độ trầm cảm trung bình",
      recommendations: [
        "Tham khảo ý kiến chuyên gia tâm lý",
        "Liệu pháp nhận thức hành vi (CBT)",
        "Hỗ trợ từ gia đình và bạn bè",
      ],
    },
    {
      min: 15,
      max: 19,
      level: "Nặng vừa",
      description: "Mức độ trầm cảm nặng vừa",
      recommendations: [
        "Cần gặp bác sĩ tâm thần ngay",
        "Có thể cần điều trị bằng thuốc",
        "Liệu pháp tâm lý chuyên sâu",
      ],
    },
    {
      min: 20,
      max: 27,
      level: "Nặng",
      description: "Mức độ trầm cảm rất nặng",
      recommendations: [
        "Cần can thiệp y tế khẩn cấp",
        "Điều trị nội trú có thể cần thiết",
        "Theo dõi chặt chẽ nguy cơ tự hại",
      ],
    },
  ],
}

const gad7Assessment: Assessment = {
  id: "gad7",
  title: "GAD-7 - Sàng lọc Lo âu",
  description: "Bộ câu hỏi chuẩn để đánh giá mức độ lo âu trong 2 tuần qua",
  questions: [
    {
      id: "gad7-1",
      text: "Cảm thấy bồn chồn, lo lắng, hoặc đứng ngồi không yên",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-2",
      text: "Không thể ngừng hoặc kiểm soát được sự lo lắng",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-3",
      text: "Lo lắng quá nhiều về những điều khác nhau",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-4",
      text: "Gặp khó khăn trong việc thư giãn",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-5",
      text: "Cảm thấy bồn chồn đến mức khó có thể ngồi yên",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-6",
      text: "Trở nên dễ bực bội hoặc cáu kỉnh",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
    {
      id: "gad7-7",
      text: "Cảm thấy sợ hãi như thể một điều gì đó tồi tệ sắp xảy ra",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Vài ngày", score: 1 },
        { value: "2", label: "Hơn nửa số ngày", score: 2 },
        { value: "3", label: "Gần như mỗi ngày", score: 3 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 4,
      level: "Tối thiểu",
      description: "Mức độ lo âu tối thiểu",
      recommendations: ["Duy trì thói quen tập thể dục", "Thực hành hít thở sâu", "Giữ lối sống cân bằng"],
    },
    {
      min: 5,
      max: 9,
      level: "Nhẹ",
      description: "Mức độ lo âu nhẹ",
      recommendations: ["Học kỹ thuật thư giãn", "Thiền định 10-15 phút/ngày", "Giảm caffeine và rượu bia"],
    },
    {
      min: 10,
      max: 14,
      level: "Trung bình",
      description: "Mức độ lo âu trung bình",
      recommendations: ["Tham khảo chuyên gia tâm lý", "Liệu pháp thư giãn cơ bắp", "Tham gia nhóm hỗ trợ"],
    },
    {
      min: 15,
      max: 21,
      level: "Nặng",
      description: "Mức độ lo âu nặng",
      recommendations: ["Cần gặp bác sĩ tâm thần", "Có thể cần điều trị thuốc", "Liệu pháp nhận thức hành vi"],
    },
  ],
}

const pcl5Assessment: Assessment = {
  id: "pcl5",
  title: "PCL-5 - Sàng lọc PTSD",
  description: "Thang đo rối loạn căng thẳng sau sang chấn tâm lý trong 1 tháng qua",
  questions: [
    {
      id: "pcl5-1",
      text: "Những ký ức, suy nghĩ, hoặc hình ảnh không mong muốn về sự kiện căng thẳng đó?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-2",
      text: "Những giấc mơ gây khó chịu về sự kiện đó?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-3",
      text: "Cảm giác như thể sự kiện đó đang xảy ra một lần nữa (hồi tưởng)?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-4",
      text: "Cảm thấy rất buồn bã, khó chịu khi có điều gì đó gợi nhớ về sự kiện?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-5",
      text: "Có những phản ứng mạnh mẽ về thể chất khi có điều gì đó gợi nhớ về sự kiện (tim đập nhanh, khó thở, đổ mồ hôi)?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-6",
      text: "Tránh né những ký ức, suy nghĩ, hoặc cảm xúc liên quan đến sự kiện?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-7",
      text: "Tránh né những hoạt động bên ngoài, địa điểm, con người, hoặc tình huống gợi nhớ về sự kiện?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-8",
      text: "Gặp khó khăn trong việc nhớ lại những phần quan trọng của sự kiện?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-9",
      text: "Có những niềm tin tiêu cực mạnh mẽ về bản thân, người khác, hoặc thế giới?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-10",
      text: "Đổ lỗi cho bản thân hoặc người khác về sự kiện hoặc những gì xảy ra sau đó?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-11",
      text: "Có những cảm xúc tiêu cực mạnh mẽ như sợ hãi, kinh hoàng, tức giận, tội lỗi, hoặc xấu hổ?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-12",
      text: "Mất hứng thú với những hoạt động mà bạn từng thích?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-13",
      text: "Cảm thấy xa cách hoặc cắt đứt với người khác?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-14",
      text: "Gặp khó khăn trong việc trải nghiệm những cảm xúc tích cực?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-15",
      text: "Hành vi khích động hoặc tự hủy hoại?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-16",
      text: "Quá cảnh giác hoặc luôn đề phòng nguy hiểm?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-17",
      text: "Dễ giật mình hoặc bị làm cho sợ hãi?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-18",
      text: "Gặp vấn đề về tập trung?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-19",
      text: "Gặp khó khăn khi đi ngủ hoặc ngủ không yên giấc?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
    {
      id: "pcl5-20",
      text: "Cảm thấy cáu kỉnh hoặc có những cơn giận dữ?",
      options: [
        { value: "0", label: "Không hề", score: 0 },
        { value: "1", label: "Một chút", score: 1 },
        { value: "2", label: "Vừa phải", score: 2 },
        { value: "3", label: "Khá nhiều", score: 3 },
        { value: "4", label: "Cực kỳ", score: 4 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 32,
      level: "Thấp",
      description: "Mức độ triệu chứng PTSD thấp",
      recommendations: ["Duy trì hoạt động xã hội", "Thực hành kỹ thuật thư giãn", "Tập thể dục đều đặn"],
    },
    {
      min: 33,
      max: 37,
      level: "Ngưỡng",
      description: "Có thể có PTSD - cần đánh giá thêm",
      recommendations: ["Tham khảo chuyên gia tâm lý", "Theo dõi triệu chứng", "Tìm hiểu về liệu pháp PTSD"],
    },
    {
      min: 38,
      max: 80,
      level: "Cao",
      description: "Có khả năng cao mắc PTSD",
      recommendations: ["Cần gặp bác sĩ tâm thần ngay", "Liệu pháp chuyên biệt cho PTSD", "Hỗ trợ từ gia đình và bạn bè"],
    },
  ],
}

const mdqAssessment: Assessment = {
  id: "mdq",
  title: "MDQ - Sàng lọc Rối loạn Khí sắc",
  description: "Bảng câu hỏi sàng lọc rối loạn lưỡng cực và các vấn đề về khí sắc",
  questions: [
    {
      id: "mdq-1",
      text: "Bạn cảm thấy tự tin vào bản thân hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-2",
      text: "Bạn ngủ ít hơn hẳn bình thường và không cảm thấy mệt mỏi hay cần ngủ bù?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-3",
      text: "Bạn nói nhiều hơn hoặc nhanh hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-4",
      text: "Suy nghĩ trong đầu bạn chạy đua dồn dập hoặc bạn không thể làm chậm dòng suy nghĩ của mình?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-5",
      text: "Bạn dễ bị xao nhãng bởi những thứ xung quanh đến mức khó tập trung hoặc đi đúng hướng?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-6",
      text: "Bạn có nhiều năng lượng hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-7",
      text: "Bạn hoạt động nhiều hơn hoặc làm nhiều việc hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-8",
      text: "Bạn trở nên hòa đồng hoặc hướng ngoại hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-9",
      text: "Bạn quan tâm đến tình dục nhiều hơn hẳn bình thường?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-10",
      text: "Bạn làm những việc bất thường hoặc những việc mà người khác cho là quá mức, dại dột, hoặc rủi ro?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "mdq-11",
      text: "Bạn tiêu tiền đến mức gây rắc rối cho bản thân hoặc gia đình?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 6,
      level: "Thấp",
      description: "Ít khả năng có rối loạn khí sắc",
      recommendations: ["Duy trì lối sống lành mạnh", "Theo dõi tâm trạng hàng ngày", "Ngủ đủ giấc"],
    },
    {
      min: 7,
      max: 13,
      level: "Cao",
      description: "Có thể có rối loạn lưỡng cực",
      recommendations: ["Cần gặp bác sĩ tâm thần", "Đánh giá chuyên sâu", "Theo dõi chu kỳ tâm trạng"],
    },
  ],
}

const scoffAssessment: Assessment = {
  id: "scoff",
  title: "SCOFF - Sàng lọc Rối loạn Ăn uống",
  description: "Bảng câu hỏi sàng lọc các rối loạn ăn uống",
  questions: [
    {
      id: "scoff-1",
      text: "Bạn có bao giờ tự làm mình nôn ói vì cảm thấy no đến khó chịu không?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "scoff-2",
      text: "Bạn có lo lắng rằng mình đã mất kiểm soát về lượng thức ăn nạp vào không?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "scoff-3",
      text: "Gần đây bạn có sụt hơn 6kg trong vòng 3 tháng không?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "scoff-4",
      text: "Bạn có tin rằng mình béo trong khi người khác nói rằng bạn quá gầy không?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
    {
      id: "scoff-5",
      text: "Thức ăn có đang chi phối cuộc sống của bạn không?",
      options: [
        { value: "0", label: "Không", score: 0 },
        { value: "1", label: "Có", score: 1 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 1,
      level: "Thấp",
      description: "Ít khả năng có rối loạn ăn uống",
      recommendations: ["Duy trì chế độ ăn cân bằng", "Tập thể dục đều đặn", "Theo dõi cân nặng hợp lý"],
    },
    {
      min: 2,
      max: 5,
      level: "Cao",
      description: "Có thể có rối loạn ăn uống",
      recommendations: ["Cần gặp chuyên gia dinh dưỡng", "Tham khảo bác sĩ tâm thần", "Liệu pháp hành vi nhận thức"],
    },
  ],
}

const asrsAssessment: Assessment = {
  id: "asrs",
  title: "ASRS - Sàng lọc ADHD",
  description: "Thang đo sàng lọc rối loạn tăng động giảm chú ý ở người lớn",
  questions: [
    {
      id: "asrs-1",
      text: "Bạn có thường gặp khó khăn khi hoàn thành những chi tiết cuối cùng của một dự án, sau khi đã làm xong những phần khó nhất không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
    {
      id: "asrs-2",
      text: "Bạn có thường gặp khó khăn trong việc sắp xếp mọi thứ theo thứ tự khi phải thực hiện một công việc đòi hỏi sự tổ chức không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
    {
      id: "asrs-3",
      text: "Bạn có thường gặp vấn đề trong việc ghi nhớ các cuộc hẹn hoặc nghĩa vụ không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
    {
      id: "asrs-4",
      text: "Khi có một công việc đòi hỏi nhiều suy nghĩ, bạn có thường né tránh hoặc trì hoãn việc bắt đầu không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
    {
      id: "asrs-5",
      text: "Bạn có thường hay cựa quậy tay chân hoặc vặn vẹo trên ghế khi phải ngồi một chỗ trong thời gian dài không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
    {
      id: "asrs-6",
      text: "Bạn có thường cảm thấy hoạt động quá mức và buộc phải làm mọi việc, như thể bị 'động cơ' thúc đẩy không?",
      options: [
        { value: "0", label: "Không bao giờ", score: 0 },
        { value: "1", label: "Hiếm khi", score: 0 },
        { value: "2", label: "Thỉnh thoảng", score: 0 },
        { value: "3", label: "Thường xuyên", score: 1 },
        { value: "4", label: "Rất thường xuyên", score: 1 },
      ],
    },
  ],
  interpretation: [
    {
      min: 0,
      max: 13,
      level: "Thấp",
      description: "Ít khả năng có ADHD",
      recommendations: ["Duy trì thói quen tốt", "Tập trung cải thiện tổ chức", "Thực hành mindfulness"],
    },
    {
      min: 14,
      max: 24,
      level: "Cao",
      description: "Có thể có ADHD - cần đánh giá chuyên sâu",
      recommendations: ["Gặp bác sĩ tâm thần", "Đánh giá neuropsychological", "Tìm hiểu về liệu pháp ADHD"],
    },
  ],
}

const LAST_SCREENING_KEY = "mcs_last_screening_v1"

export function PsychologicalScreening() {
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [showAiSupport, setShowAiSupport] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!showResults || !selectedAssessment) return
    try {
      const score = selectedAssessment.questions.reduce((total, question) => {
        const answer = answers[question.id]
        const option = question.options.find((opt) => opt.value === answer)
        return total + (option?.score || 0)
      }, 0)
      const interp = selectedAssessment.interpretation.find((it) => score >= it.min && score <= it.max)
      localStorage.setItem(
        LAST_SCREENING_KEY,
        JSON.stringify({
          assessment_id: selectedAssessment.id,
          title: selectedAssessment.title,
          score,
          level: interp?.level || "",
          ts: Date.now(),
        })
      )
    } catch {}
  }, [showResults, selectedAssessment, answers])




  const assessments = [phq9Assessment, gad7Assessment, pcl5Assessment, mdqAssessment, scoffAssessment, asrsAssessment]

  const handleStartAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
  }

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setTimeout(() => {
      handleNext()
    }, 500)
  }

  const handleNext = () => {
    if (selectedAssessment && currentQuestion < selectedAssessment.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      setShowResults(true)
    }
  }

  const calculateScore = () => {
    if (!selectedAssessment) return 0
    return selectedAssessment.questions.reduce((total, question) => {
      const answer = answers[question.id]
      const option = question.options.find((opt) => opt.value === answer)
      return total + (option?.score || 0)
    }, 0)
  }

  const getInterpretation = (score: number) => {
    if (!selectedAssessment) return null
    return selectedAssessment.interpretation.find((interp) => score >= interp.min && score <= interp.max)
  }

  const resetAssessment = () => {
    setSelectedAssessment(null)
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setShowAiSupport(false)
  }

  if (showResults && selectedAssessment) {
    const score = calculateScore()
    const interpretation = getInterpretation(score)
    const maxScore = selectedAssessment.questions.reduce((sum, q) => {
      const m = Math.max(...q.options.map(o => o.score))
      return sum + m
    }, 0)
    const circumference = 283
    const ratio = maxScore > 0 ? score / maxScore : 0
    const dashoffset = Math.max(0, circumference - Math.round(ratio * circumference))
    const scoreColor = ratio < 0.33 ? "#10b981" : (ratio < 0.66 ? "#f59e0b" : "#ef4444")

    return (
      <div className="p-4 space-y-4 max-h-screen overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Kết quả {selectedAssessment.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interpretation && (
              <>
                <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-6">
                  <div className="text-center p-4 bg-muted rounded-xl">
                    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={dashoffset} transform="rotate(-90 50 50)" strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-4xl font-bold">{score}</span>
                        <p className="text-sm text-gray-500">{interpretation.level}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{interpretation.description}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {interpretation.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm bg-gray-50 p-3 rounded-xl">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => router.push('/tam-su')} variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {showAiSupport ? "Ẩn" : "Tâm sự"} với AI
                  </Button>

                  {false && (
                    <AiChatBox
                      placeholder="Chia sẻ cảm xúc của bạn..."
                      initialMessage={`Tôi hiểu rằng bạn vừa hoàn thành bài đánh giá và có thể đang có những cảm xúc phức tạp. Tôi ở đây để lắng nghe và hỗ trợ bạn. Bạn có muốn chia sẻ về cảm xúc hiện tại của mình không?`}
                      context="psychological support"
                    />
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Kết quả này chỉ mang tính chất tham khảo. Nếu bạn có lo ngại về sức khỏe tâm thần, 
                    hãy tham khảo ý kiến của chuyên gia y tế.
                  </AlertDescription>
                </Alert>

                {/* Action buttons with improved spacing and visibility */}
                <div className="space-y-3 pt-4 border-t">
                  <Button
                    onClick={() => setShowPDFGenerator(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Tạo báo cáo PDF
                  </Button>
                  
                  <Button 
                    onClick={resetAssessment} 
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Thực hiện bài test khác
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* PDF Generator Component - moved outside main card for better layout */}
        {showPDFGenerator && selectedAssessment && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <PDFReportGenerator
              assessment={selectedAssessment}
              answers={answers}
              score={calculateScore()}
              interpretation={getInterpretation(calculateScore()) || { level: "Không xác định", description: "Chưa có diễn giải", recommendations: [] }}
              onClose={() => setShowPDFGenerator(false)}
            />
          </div>
        )}
      </div>
    )
  }

  if (selectedAssessment) {
    const progress = ((currentQuestion + 1) / selectedAssessment.questions.length) * 100
    const question = selectedAssessment.questions[currentQuestion]
    const currentAnswer = answers[question.id]

    return (
      <div className="p-4 space-y-4 max-h-screen overflow-y-auto">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Bước {currentQuestion + 1}/{selectedAssessment.questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{question.text}</CardTitle>
            <CardDescription>Trong vòng hai tuần qua, bạn có thường bị những vấn đề dưới đây làm phiền ở mức độ nào?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RadioGroup 
              key={`${selectedAssessment.id}-${question.id}`}
              value={currentAnswer} 
              onValueChange={(value) => handleAnswer(question.id, value)}
            >
                {question.options.map((option) => {
                  const uniqueId = `${selectedAssessment.id}-q${question.id}-${option.value}`
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={uniqueId} />
                      <Label htmlFor={uniqueId} className="flex-1 cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
              
              {currentAnswer && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAnswer(question.id, "")}
                  className="text-xs"
                >
                  Làm mới lựa chọn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 pb-4">
          <Button variant="outline" onClick={resetAssessment} className="flex-1 bg-transparent">
            Hủy bỏ
          </Button>
          <Button onClick={handleNext} disabled={!currentAnswer} className="flex-1">
            {currentQuestion === selectedAssessment.questions.length - 1 ? "Hoàn thành" : "Tiếp theo"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-h-screen overflow-y-auto">
      <div className="text-center py-4">
        <h2 className="text-xl font-bold mb-2">Sàng lọc Tâm lý</h2>
        <p className="text-muted-foreground text-sm">Đánh giá sức khỏe tâm thần với các bài test chuẩn quốc tế</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Các bài test này chỉ mang tính chất sàng lọc ban đầu, không thay thế cho chẩn đoán y khoa chuyên nghiệp.
        </AlertDescription>
      </Alert>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Hỗ trợ tâm lý AI</h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            Trước khi làm bài test, bạn có thể tâm sự với AI để được hỗ trợ và tư vấn ban đầu.
          </p>
          <Button
            onClick={() => router.push('/tam-su')}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {showAiSupport ? "Ẩn" : "Bắt đầu"} tâm sự
          </Button>

          {false && (
            <div className="mt-4">
              <AiChatBox
                placeholder="Chia sẻ cảm xúc của bạn..."
                initialMessage="Xin chào! Tôi là trợ lý AI hỗ trợ tâm lý. Tôi ở đây để lắng nghe và hỗ trợ bạn. Bạn có muốn chia sẻ về tâm trạng hoặc những gì đang khiến bạn lo lắng không?"
                context="psychological support"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="cursor-pointer min-h-[80px] rounded-[12px] shadow-[0px_2px_6px_rgba(0,0,0,0.05)] transition-all hover:scale-[1.02] hover:bg-muted/30"
            onClick={() => handleStartAssessment(assessment)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{assessment.title}</CardTitle>
                  <CardDescription className="mt-1">{assessment.description}</CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Lưu ý quan trọng:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Trả lời thật lòng để có kết quả chính xác nhất</li>
            <li>• Mỗi bài test mất khoảng 3-5 phút</li>
            <li>• Thông tin của bạn được bảo mật tuyệt đối</li>
            <li>• Nếu có kết quả bất thường, hãy tham khảo chuyên gia</li>
          </ul>
        </CardContent>
      </Card>

      {/* Add some bottom padding to ensure content is not cut off */}
      <div className="pb-8"></div>
    </div>
  )
}
