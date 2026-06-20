"use client"

import { Camera, Mic, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpeechControlDockProps {
  isLoading: boolean
  isRecording: boolean
  capturedImage: string | null
  onStartCamera: () => void
  onUploadClick: () => void
  onToggleRecording: () => void
  onClearCapturedImage: () => void
}

export function SpeechControlDock({
  isLoading,
  isRecording,
  capturedImage,
  onStartCamera,
  onUploadClick,
  onToggleRecording,
  onClearCapturedImage,
}: SpeechControlDockProps) {
  return (
    <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 sm:bottom-8">
      <div className="glass-panel dark:glass-panel-dark relative flex items-center gap-4 rounded-full border border-border/70 px-4 py-3 shadow-[0_28px_60px_-36px_rgba(15,20,25,0.55)]">
        <button
          onClick={onStartCamera}
          disabled={isLoading || isRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-accent text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          title="Chụp ảnh"
        >
          <Camera className="h-5 w-5" />
        </button>

        <button
          onClick={onUploadClick}
          disabled={isLoading || isRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          title="Tải ảnh lên"
        >
          <Upload className="h-5 w-5" />
        </button>

        <div className="relative">
          {isRecording ? (
            <>
              <div className="absolute inset-0 h-16 w-16 rounded-full bg-destructive/40 animate-ping" />
              <div className="absolute inset-1 h-14 w-14 rounded-full bg-destructive/20" />
            </>
          ) : null}
          <button
            onClick={onToggleRecording}
            disabled={isLoading}
            className={cn(
              "relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
              isRecording ? "bg-destructive animate-pulse" : "bg-primary hover:bg-primary/90",
            )}
            title={isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
          >
            <Mic className="h-7 w-7" />
          </button>
        </div>

        {isRecording ? (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-lg">
              Đang ghi âm...
            </div>
          </div>
        ) : null}

        {capturedImage ? (
          <div className="absolute -top-36 left-1/2 -translate-x-1/2">
            <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur-sm">
              <div className="relative">
                <img src={capturedImage} alt="Captured" className="h-24 w-24 rounded-xl object-cover" />
                <button
                  onClick={onClearCapturedImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md"
                  title="Xóa ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1 text-center text-xs text-muted-foreground">Ảnh đã chọn</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
