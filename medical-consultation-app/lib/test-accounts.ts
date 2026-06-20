// Test accounts for development and testing
export const TEST_ACCOUNTS = {
  doctors: [
    {
      id: "doctor_001",
      username: "doctor.tuan",
      email: "dr.tuan@aimed.vn",
      password: "Demo123!",
      fullName: "Dr. Tuấn Anh",
      role: "doctor",
      specialty: "Tâm lý học",
      avatar: "👨‍⚕️",
    },
    {
      id: "doctor_002",
      username: "doctor.linh",
      email: "dr.linh@aimed.vn",
      password: "Demo123!",
      fullName: "Dr. Linh Phương",
      role: "doctor",
      specialty: "Sức khỏe tâm thần",
      avatar: "👩‍⚕️",
    },
  ],
  patients: [
    {
      id: "patient_001",
      username: "patient.minh",
      email: "minh.nguyen@gmail.com",
      password: "Demo123!",
      fullName: "Nguyễn Minh Anh",
      role: "patient",
      age: 28,
      avatar: "👨‍💼",
    },
    {
      id: "patient_002",
      username: "patient.linh",
      email: "linh.tran@gmail.com",
      password: "Demo123!",
      fullName: "Trần Linh Đan",
      role: "patient",
      age: 25,
      avatar: "👩‍💼",
    },
  ],
  admins: [
    {
      id: "admin_001",
      username: "admin.aleian",
      email: "admin@aimed.vn",
      password: "Demo123!",
      fullName: "Aleian Admin",
      role: "admin",
      scope: "Runtime & system control",
      avatar: "🛡️",
    },
  ],
}

export type TestAccount =
  | (typeof TEST_ACCOUNTS.doctors)[number]
  | (typeof TEST_ACCOUNTS.patients)[number]
  | (typeof TEST_ACCOUNTS.admins)[number]

export function getAllTestAccounts(): TestAccount[] {
  return [...TEST_ACCOUNTS.doctors, ...TEST_ACCOUNTS.patients, ...TEST_ACCOUNTS.admins]
}

export const findTestAccount = (username: string, password: string): TestAccount | null => {
  const allAccounts = getAllTestAccounts()
  const account = allAccounts.find(
    (acc) => (acc.username === username || acc.email === username) && acc.password === password
  )
  return account || null
}
