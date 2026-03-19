"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DoctorDirectoryPage() {
  const [doctorId, setDoctorId] = useState("")
  const canGo = useMemo(() => doctorId.trim().length > 0, [doctorId])

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="text-2xl font-semibold">Giới thiệu bác sĩ</div>
        <div className="text-sm text-muted-foreground">
          Nhập mã bác sĩ để xem hồ sơ public. Bác sĩ có thể chỉnh sửa hồ sơ trong tài khoản của mình.
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4 flex flex-col sm:flex-row gap-2">
        <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Ví dụ: user_id của bác sĩ" />
        <Button
          disabled={!canGo}
          onClick={() => {
            const id = doctorId.trim()
            if (!id) return
            window.location.href = `/bac-si/${encodeURIComponent(id)}`
          }}
        >
          Xem hồ sơ
        </Button>
      </div>
    </div>
  )
}

