export type DoctorPatient = {
  id: number
  name: string
  age: number
  phone: string
  email: string
  lastVisit: string
  status: "Hoạt động" | "Chưa tham gia"
  sessions: number
  primaryConcern: string
}

export type DoctorConsultation = {
  id: string
  patientId: number
  patient: string
  time: string
  status: "Đã hoàn tất" | "Đang xử lý" | "Chờ xác nhận"
  type: string
  conversationId: string
}

export type DoctorReport = {
  id: string
  title: string
  date: string
  type: string
  patients: number
  sessions: number
  status: "Hoàn tất" | "Đang soạn"
  range?: { from: string; to: string }
  patientId?: number
  content?: string
}

export const demoPatients: DoctorPatient[] = [
  {
    id: 1,
    name: "Nguyễn Minh Anh",
    age: 28,
    phone: "0912-345-678",
    email: "minh.nguyen@gmail.com",
    lastVisit: "2024-03-15",
    status: "Hoạt động",
    sessions: 5,
    primaryConcern: "Lo âu, mất ngủ",
  },
  {
    id: 2,
    name: "Trần Linh Đan",
    age: 25,
    phone: "0913-456-789",
    email: "linh.tran@gmail.com",
    lastVisit: "2024-03-14",
    status: "Hoạt động",
    sessions: 3,
    primaryConcern: "Stress công việc",
  },
  {
    id: 3,
    name: "Phạm Văn A",
    age: 32,
    phone: "0914-567-890",
    email: "phama@gmail.com",
    lastVisit: "2024-03-10",
    status: "Chưa tham gia",
    sessions: 1,
    primaryConcern: "Theo dõi sức khỏe tổng quát",
  },
]

export const demoConsultations: DoctorConsultation[] = [
  { id: "c1", patientId: 1, patient: "Nguyễn Minh Anh", time: "2 giờ trước", status: "Đã hoàn tất", type: "Tâm lý", conversationId: "demo-consult-1" },
  { id: "c2", patientId: 2, patient: "Trần Linh Đan", time: "4 giờ trước", status: "Đang xử lý", type: "Sức khỏe", conversationId: "demo-consult-2" },
  { id: "c3", patientId: 3, patient: "Phạm Văn A", time: "1 ngày trước", status: "Chờ xác nhận", type: "Tâm lý", conversationId: "demo-consult-3" },
]

export const demoReports: DoctorReport[] = [
  {
    id: "r1",
    title: "Báo cáo hàng tháng - Tháng 3",
    date: "2024-03-15",
    type: "Hàng tháng",
    patients: 24,
    sessions: 45,
    status: "Hoàn tất",
    range: { from: "2024-03-01", to: "2024-03-31" },
  },
  {
    id: "r2",
    title: "Báo cáo hàng tháng - Tháng 2",
    date: "2024-02-28",
    type: "Hàng tháng",
    patients: 22,
    sessions: 42,
    status: "Hoàn tất",
    range: { from: "2024-02-01", to: "2024-02-29" },
  },
  {
    id: "r3",
    title: "Báo cáo quý - Quý I 2024",
    date: "2024-03-31",
    type: "Quý",
    patients: 24,
    sessions: 130,
    status: "Đang soạn",
    range: { from: "2024-01-01", to: "2024-03-31" },
  },
  {
    id: "r4",
    title: "Báo cáo năm - 2023",
    date: "2024-01-15",
    type: "Năm",
    patients: 18,
    sessions: 312,
    status: "Hoàn tất",
    range: { from: "2023-01-01", to: "2023-12-31" },
  },
]

export function getDemoPatient(id: number) {
  return demoPatients.find((p) => p.id === id) || null
}

