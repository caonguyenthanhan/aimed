"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserRound, ExternalLink, MapPin, Star, Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedBacSiProps {
  context?: {
    specialty?: string
    symptom?: string
    reason?: string
  }
  onComplete?: (doctor: { id: string; name: string; specialty: string }) => void
  onNavigate?: () => void
}

interface Doctor {
  id: string
  name: string
  specialty: string
  rating: number
  location: string
  available: boolean
  nextSlot?: string
  avatar?: string
}

// Mock doctors - in real app, this would be from API
const mockDoctors: Doctor[] = [
  {
    id: "1",
    name: "BS. Nguyễn Văn A",
    specialty: "Nội tổng quát",
    rating: 4.8,
    location: "Quận 1, TP.HCM",
    available: true,
    nextSlot: "Hôm nay, 14:00",
  },
  {
    id: "2",
    name: "BS. Trần Thị B",
    specialty: "Tâm thần kinh",
    rating: 4.9,
    location: "Quận 3, TP.HCM",
    available: true,
    nextSlot: "Ngày mai, 9:00",
  },
  {
    id: "3",
    name: "BS. Lê Văn C",
    specialty: "Tim mạch",
    rating: 4.7,
    location: "Quận 7, TP.HCM",
    available: false,
  },
]

export function EmbedBacSi({ context, onComplete, onNavigate }: EmbedBacSiProps) {
  const router = useRouter()
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const filteredDoctors = context?.specialty 
    ? mockDoctors.filter(d => d.specialty.toLowerCase().includes(context.specialty!.toLowerCase()))
    : mockDoctors

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    onComplete?.({ id: doctor.id, name: doctor.name, specialty: doctor.specialty })
  }

  const goToFullPage = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push("/bac-si")
    }
  }

  const goToBooking = (doctorId: string) => {
    router.push(`/bac-si?book=${doctorId}`)
  }

  return (
    <Card className="w-full max-w-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Tìm bác sĩ</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {context?.specialty 
            ? `Bác sĩ chuyên khoa ${context.specialty}` 
            : "Bác sĩ phù hợp với bạn"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {filteredDoctors.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Không tìm thấy bác sĩ phù hợp.
          </p>
        ) : (
          filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                selectedDoctor?.id === doctor.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserRound className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{doctor.name}</span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs">{doctor.rating}</span>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="text-xs mt-1">
                    {doctor.specialty}
                  </Badge>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {doctor.location}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {doctor.available ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Clock className="h-3 w-3" />
                        {doctor.nextSlot}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Hết lịch</span>
                    )}
                    
                    <Button
                      size="sm"
                      variant={doctor.available ? "default" : "outline"}
                      disabled={!doctor.available}
                      onClick={() => {
                        handleSelectDoctor(doctor)
                        if (doctor.available) goToBooking(doctor.id)
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      {doctor.available ? "Đặt lịch" : "Không có"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullPage}
          className="w-full text-xs text-muted-foreground"
        >
          Xem tất cả bác sĩ <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
