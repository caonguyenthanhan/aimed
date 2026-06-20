import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Users, 
  Target, 
  LayoutList,
  Cpu,
  UserCog,
  Handshake
} from 'lucide-react';

// Dữ liệu ban đầu được trích xuất từ file team-todo.md
const INITIAL_DATA = {
  title: "TRIỂN KHAI KLTN MULTI-AGENT Y TẾ & TÂM LÝ",
  strategy: "Phát triển nhanh với Gemini API ➔ Tích hợp Fine-tuned GPU LLM sau",
  duration: "16 Tuần",
  team: ["Thành An (AI/Data/Prompt/GraphRAG)", "Phú Thịnh (System/LangGraph/NextJS/FastAPI)"],
  legend: [
    { type: "AI IDE", icon: <Cpu className="w-4 h-4 mr-1" />, emoji: "🤖", label: "[AI IDE]", desc: "Dùng AI sinh code (80-100%)", colors: "bg-blue-50 text-blue-700 border-blue-200" },
    { type: "Manual", icon: <UserCog className="w-4 h-4 mr-1" />, emoji: "🧑‍💻", label: "[Manual]", desc: "Cấu hình, thiết kế kiến trúc", colors: "bg-orange-50 text-orange-700 border-orange-200" },
    { type: "Hybrid", icon: <Handshake className="w-4 h-4 mr-1" />, emoji: "🤝", label: "[Hybrid]", desc: "AI nháp, Người review", colors: "bg-green-50 text-green-700 border-green-200" }
  ],
  sprints: [
    {
      id: 1,
      name: "SPRINT 1: Tái cấu trúc, Phân quyền & Chuẩn bị Môi trường",
      time: "Tuần 1-2",
      goal: "Setup base project, cấu hình Gemini API và tạo ranh giới Bác sĩ - Bệnh nhân.",
      tasks: [
        { id: "s1t1", type: "Manual", text: "Tạo repo Github mới, clone code từ dự án tiền thân.", completed: true },
        { id: "s1t2", type: "AI IDE", text: "Tích hợp Auth & Phân quyền (Role-Based Access Control): Tạo 2 role Patient và Doctor. Bệnh nhân vào /chat, Bác sĩ vào /doctor-workspace.", completed: false },
        { id: "s1t3", type: "AI IDE", text: "Thiết kế & Code Unified Composer trên Next.js (cho Bệnh nhân).", completed: false },
        { id: "s1t4", type: "AI IDE", text: "Refactor FastAPI: Tích hợp google-generativeai. Cấu hình .env chứa GEMINI_API_KEY.", completed: false },
        { id: "s1t5", type: "Manual", text: "Cài đặt và cấu hình Neo4j (AuraDB) và Zep (Long-term memory).", completed: false },
        { id: "s1t6", type: "Hybrid", text: "Định nghĩa Ontology (Cấu trúc đồ thị) cho Y tế.", completed: false }
      ]
    },
    {
      id: 2,
      name: "SPRINT 2: Doctor Workspace & Xây dựng Không gian Y khoa",
      time: "Tuần 3-5",
      goal: "Bác sĩ có chỗ làm việc, AI có khả năng truy xuất đồ thị.",
      tasks: [
        { id: "s2t1", type: "AI IDE", text: "Code UI Doctor Workspace - Phần 1: Màn hình Patient List và Emotion Dashboard (Hiển thị biểu đồ điểm số PHQ-9 mock data).", completed: false },
        { id: "s2t2", type: "Hybrid", text: "Thu thập & Làm sạch dữ liệu Y tế (bệnh, thuốc).", completed: false },
        { id: "s2t3", type: "AI IDE", text: "Viết script dùng Gemini API trích xuất Thực thể/Quan hệ từ text -> Import vào Neo4j.", completed: false },
        { id: "s2t4", type: "AI IDE", text: "Tích hợp Vector Search + Graph Search -> Tạo Tool Python search_medical_graph.", completed: false },
        { id: "s2t5", type: "AI IDE", text: "Viết Node 'Agent Y khoa' trong LangGraph (Gemini model), cấp quyền gọi tool.", completed: false }
      ]
    },
    {
      id: 3,
      name: "SPRINT 3: Tác tử Tâm lý & Luồng Setup Level Điều trị",
      time: "Tuần 6-8",
      goal: "Đánh giá ẩn và cung cấp công cụ 'Lập trình AI' cho Bác sĩ.",
      tasks: [
        { id: "s3t1", type: "AI IDE", text: "Code UI Doctor Workspace - Phần 2: Màn hình Stepped Care Setup. Form cho phép Bác sĩ nhập: Ngưỡng điểm cảnh báo, Link Video YouTube xả stress, Thông điệp dặn dò.", completed: false },
        { id: "s3t2", type: "AI IDE", text: "Viết API FastAPI lưu cấu hình Level Điều trị này vào Database theo từng ID Bệnh nhân.", completed: false },
        { id: "s3t3", type: "AI IDE", text: "Xây dựng luồng Logic 'Đánh giá ẩn': LLM chain chạy ngầm chấm điểm PHQ-9/GAD-7 từ log chat, lưu vào Zep.", completed: false },
        { id: "s3t4", type: "Hybrid", text: "Viết System Prompt động cho Agent Tâm lý: Prompt phải tự động fetch (kéo) Cấu hình Level Điều trị của Bác sĩ từ Database để quyết định có nên gửi link Video hay đổi giọng điệu hay không.", completed: false },
        { id: "s3t5", type: "AI IDE", text: "Code Node 'Agent Tâm lý' và 'Node Chấm điểm ngầm' vào LangGraph.", completed: false }
      ]
    },
    {
      id: 4,
      name: "SPRINT 4: Tác tử Thư ký & Function Calling B2B",
      time: "Tuần 9-11",
      goal: "Kết nối hành động giữa Bệnh nhân và Bác sĩ.",
      tasks: [
        { id: "s4t1", type: "AI IDE", text: "Cấu hình Google Calendar API làm Tool book_appointment.", completed: false },
        { id: "s4t2", type: "AI IDE", text: "Code UI Doctor Workspace - Phần 3: Màn hình Appointment & Alerts. Nhận thông báo 'Cờ đỏ' khi điểm Tâm lý bệnh nhân vượt ngưỡng. Có nút [Duyệt lịch hẹn].", completed: false },
        { id: "s4t3", type: "AI IDE", text: "Viết Cronjob kích hoạt Tác tử Tâm lý chủ động nhắn tin hỏi thăm bệnh nhân.", completed: false },
        { id: "s4t4", type: "AI IDE", text: "Viết logic rẽ nhánh LangGraph: Nếu điểm > Ngưỡng -> Agent Thư ký bắn Notification/Email khẩn cấp cho Bác sĩ.", completed: false }
      ]
    },
    {
      id: 5,
      name: "SPRINT 5: Tích hợp Fine-Tuned GPU LLM & Hybrid Routing",
      time: "Tuần 12-13",
      goal: "Ráp mô hình 'nhà làm' và hoàn thiện cơ chế Fallback.",
      tasks: [
        { id: "s5t1", type: "Manual", text: "Xuất và Deploy mô hình Llama 3.1 fine-tuned (GGUF/vLLM).", completed: false },
        { id: "s5t2", type: "AI IDE", text: "Cập nhật LangGraph: Đổi LLM từ Gemini sang Local GPU Server.", completed: false },
        { id: "s5t3", type: "AI IDE", text: "Thêm Giao diện Quản lý Đồng ý (Consent) bên phía Bệnh nhân: Nút [Cho phép Bác sĩ xem dữ liệu biểu đồ cảm xúc].", completed: false },
        { id: "s5t4", type: "AI IDE", text: "Cài đặt luồng Offboarding: Viết hàm Python xóa lịch sử trong Zep khi User ngắt kết nối.", completed: false },
        { id: "s5t5", type: "Manual", text: "Kiểm thử thuật toán Smart Routing: Chuyển đổi mượt mà giữa GPU Server và Gemini API / Local CPU.", completed: false }
      ]
    },
    {
      id: 6,
      name: "SPRINT 6: Testing, Đo lường & Viết Báo cáo KLTN",
      time: "Tuần 14-16",
      goal: "Đóng gói dự án, đánh giá và viết luận văn.",
      tasks: [
        { id: "s6t1", type: "Manual", text: "Đóng vai (Role-play) Testing: Đóng vai Bác sĩ setup level -> Đóng vai bệnh nhân chat để xem AI phản ứng có đúng theo cấu hình của Bác sĩ không.", completed: false },
        { id: "s6t2", type: "Hybrid", text: "Đo lường các chỉ số: TTFB, Tỷ lệ Fallback, Độ trễ của GraphRAG.", completed: false },
        { id: "s6t3", type: "Hybrid", text: "Viết Báo cáo KLTN theo Đề cương. Nhấn mạnh 'Không gian Bác sĩ' và 'Luồng Setup Level' ở Chương 2 & 3.", completed: false },
        { id: "s6t4", type: "AI IDE", text: "Đóng gói dự án (Docker Compose).", completed: false },
        { id: "s6t5", type: "Manual", text: "Làm Slide thuyết trình và Quay sẵn Video Demo (1 video đóng vai bệnh nhân, 1 video đóng vai bác sĩ).", completed: false }
      ]
    }
  ]
};

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);

  // Tính toán tiến độ
  const progress = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    data.sprints.forEach(sprint => {
      sprint.tasks.forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
    });
    return {
      total: totalTasks,
      completed: completedTasks,
      percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
    };
  }, [data]);

  const toggleTask = (sprintId, taskId) => {
    setData(prevData => {
      const newSprints = prevData.sprints.map(sprint => {
        if (sprint.id === sprintId) {
          const newTasks = sprint.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: !task.completed };
            }
            return task;
          });
          return { ...sprint, tasks: newTasks };
        }
        return sprint;
      });
      return { ...prevData, sprints: newSprints };
    });
  };

  const getBadgeStyle = (type) => {
    const legendItem = INITIAL_DATA.legend.find(l => l.type === type);
    return legendItem ? legendItem.colors : "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getBadgeIcon = (type) => {
    const legendItem = INITIAL_DATA.legend.find(l => l.type === type);
    return legendItem ? legendItem.icon : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                {data.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Chiến lược: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{data.strategy}</span>
              </p>
            </div>
            
            {/* Global Progress */}
            <div className="w-full md:w-64 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-semibold text-slate-700">Tiến độ tổng</span>
                <span className="text-lg font-bold text-indigo-600">{progress.percent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                  style={{ width: `${progress.percent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 text-right">
                {progress.completed} / {progress.total} tasks hoàn thành
              </p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Thời gian:</span> {data.duration}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Team:</span>
              <div className="flex gap-2">
                {data.team.map((member, idx) => (
                  <span key={idx} className="bg-white px-2 py-0.5 rounded text-xs border border-slate-200 shadow-sm">
                    {member.split(' ')[0] + ' ' + member.split(' ')[1]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Legend / Bảng chú giải */}
        <section className="mb-8 bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LayoutList className="w-4 h-4" /> Bảng chú giải nhiệm vụ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.legend.map((item, idx) => (
              <div key={idx} className={`flex flex-col p-3 rounded-lg border ${item.colors} bg-opacity-30`}>
                <div className="flex items-center font-bold mb-1">
                  <span className="mr-2 text-lg">{item.emoji}</span> {item.label}
                </div>
                <div className="text-sm opacity-90">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sprints List */}
        <div className="space-y-6">
          {data.sprints.map((sprint, sIdx) => {
            const sprintCompleted = sprint.tasks.filter(t => t.completed).length;
            const sprintTotal = sprint.tasks.length;
            const sprintPercent = sprintTotal === 0 ? 0 : Math.round((sprintCompleted / sprintTotal) * 100);
            const isAllDone = sprintPercent === 100;

            return (
              <div 
                key={sprint.id} 
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isAllDone ? 'border-green-300 bg-green-50/10' : 'border-slate-200'}`}
              >
                {/* Sprint Header */}
                <div className={`p-5 md:p-6 border-b ${isAllDone ? 'bg-green-50/50 border-green-100' : 'border-slate-100'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg md:text-xl font-bold text-slate-800">
                          {sprint.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {sprint.time}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm flex items-start gap-1.5 mt-2">
                        <Target className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                        <span><strong>Mục tiêu:</strong> {sprint.goal}</span>
                      </p>
                    </div>
                    
                    {/* Sprint Progress */}
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div className="flex-1 w-24">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${isAllDone ? 'bg-green-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${sprintPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${isAllDone ? 'text-green-600' : 'text-slate-600'}`}>
                        {sprintPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-slate-100">
                  {sprint.tasks.map((task, tIdx) => (
                    <div 
                      key={task.id} 
                      onClick={() => toggleTask(sprint.id, task.id)}
                      className={`group flex items-start gap-3 p-4 md:px-6 hover:bg-slate-50 cursor-pointer transition-colors ${task.completed ? 'bg-slate-50/50' : ''}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        )}
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-start gap-2 flex-1">
                        <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded border text-xs font-semibold whitespace-nowrap w-fit ${getBadgeStyle(task.type)}`}>
                          {getBadgeIcon(task.type)}
                          {INITIAL_DATA.legend.find(l => l.type === task.type)?.label || task.type}
                        </span>
                        
                        <p className={`text-sm md:text-base transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {task.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}