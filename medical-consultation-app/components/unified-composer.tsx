"use client"

import { RefObject } from "react"
import { Send, X, Mic, AudioLines, KeyRound, Sparkles } from "lucide-react"

export type UnifiedComposerModel = "flash" | "pro"

export type UnifiedComposerSelectedImage = {
  base64: string
  name?: string | null
  mime?: string | null
}

export type UnifiedComposerProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  isLoading: boolean

  suggestedQuestions: string[]
  onSuggestedQuestion: (question: string) => void

  showTools: boolean
  onToggleTools: () => void

  fileInputRef: RefObject<HTMLInputElement | null>
  docInputRef: RefObject<HTMLInputElement | null>
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDocChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  selectedImage: UnifiedComposerSelectedImage | null
  onRemoveImage: () => void
  selectedDocName: string | null
  onRemoveDoc: () => void

  selectedModel: UnifiedComposerModel
  onSelectedModelChange: (model: UnifiedComposerModel) => void
  onStartNewConversation: () => void | Promise<void>

  isRecording: boolean
  onToggleRecording: () => void | Promise<void>
  onGotoSpeechChat: () => void | Promise<void>

  isLiveMode?: boolean
  onToggleLiveMode?: () => void | Promise<void>

  isTextLiveMode?: boolean
  onToggleTextLiveMode?: () => void | Promise<void>

  onManageKey?: () => void | Promise<void>

  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void

  agentMode?: boolean
  onToggleAgentMode?: () => void
}

export function UnifiedComposer(props: UnifiedComposerProps) {
  const canSend = (!!props.value.trim() || !!props.selectedImage?.base64 || !!props.selectedDocName) && !props.isLoading

  return (
    <div
      className="flex-shrink-0 p-3 sm:p-4 bg-card/80 backdrop-blur-sm border-t border-border relative z-10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <div className="max-w-2xl mx-auto">
        {/* Suggested Questions - Grid on desktop, horizontal scroll on mobile */}
        <div className="mb-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
          {props.suggestedQuestions.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => props.onSuggestedQuestion(q)}
              className="px-3 py-2 rounded-xl bg-secondary hover:bg-accent hover:text-accent-foreground text-foreground text-xs font-medium border border-border hover:border-accent transition-all duration-200 text-left truncate"
            >
              {q}
            </button>
          ))}
        </div>

        {props.selectedImage?.base64 && (
          <div className="mb-3">
            <div className="relative inline-block">
              <img
                src={`data:${props.selectedImage.mime || "image/*"};base64,${props.selectedImage.base64}`}
                alt={props.selectedImage.name || "Ảnh xem trước"}
                className="h-24 w-24 md:h-28 md:w-28 rounded-lg object-cover shadow-md border border-slate-200 dark:border-slate-700"
              />
              <button
                onClick={props.onRemoveImage}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition"
                title="Xóa ảnh"
                aria-label="Xóa ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {props.selectedDocName && (
          <div className="mb-3">
            <div className="relative inline-block bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 pr-8 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">DOC</span>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium truncate max-w-[150px]">{props.selectedDocName}</span>
              </div>
              <button
                onClick={props.onRemoveDoc}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition"
                title="Xóa tài liệu"
                aria-label="Xóa tài liệu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-card shadow-lg border border-border px-3 sm:px-4 py-2 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
          <textarea
            value={props.value}
            onChange={(e) => props.onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                props.onSubmit()
              }
            }}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent text-foreground resize-none py-2.5 max-h-28 overflow-y-auto placeholder-muted-foreground"
            style={{ WebkitTapHighlightColor: "transparent", minHeight: "40px" }}
            disabled={props.isLoading}
            rows={1}
          />
          <button
            onClick={props.onSubmit}
            disabled={!canSend}
            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${
              canSend
                ? "bg-primary hover:opacity-90 text-primary-foreground shadow-md active:scale-95"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Compact Toolbar */}
        <div className="mt-2 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={props.onToggleTools}
              className="h-8 w-8 rounded-lg bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-all text-muted-foreground"
              aria-label="Toggle tools"
            >
              <span className="text-lg font-medium">+</span>
            </button>
            {props.showTools && (
              <div className="flex items-center gap-1">
                <input ref={props.fileInputRef} type="file" accept="image/*" className="hidden" onChange={props.onImageChange} />
                <button
                  onClick={() => props.fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent hover:text-accent-foreground text-muted-foreground text-xs font-medium transition-all"
                >
                  Ảnh
                </button>
                <input
                  ref={props.docInputRef}
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={props.onDocChange}
                />
                <button
                  onClick={() => props.docInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent hover:text-accent-foreground text-muted-foreground text-xs font-medium transition-all"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {typeof props.onToggleAgentMode === "function" ? (
              <button
                onClick={props.onToggleAgentMode}
                className={`px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold ${
                  props.agentMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title="Agent mode"
              >
                agent
              </button>
            ) : null}
            <select
              value={props.selectedModel}
              onChange={(e) => props.onSelectedModelChange(e.target.value as UnifiedComposerModel)}
              className="px-2 py-1.5 border border-border rounded-lg text-xs bg-card text-foreground cursor-pointer"
            >
              <option value="flash">flash</option>
              <option value="pro">pro</option>
            </select>
            <button
              onClick={props.onStartNewConversation}
              className="px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all text-xs font-medium"
              title="Cuộc hội thoại mới"
            >
              Mới
            </button>
            <button
              onClick={props.onToggleRecording}
              disabled={props.isLoading}
              className={`h-8 w-8 rounded-lg transition-all active:scale-95 flex items-center justify-center ${
                props.isRecording 
                  ? "bg-destructive text-destructive-foreground shadow-md" 
                  : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={props.isRecording ? "Stop recording" : "Start recording"}
            >
              <Mic className={`h-4 w-4 ${props.isRecording ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={props.onGotoSpeechChat}
              className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-center"
              title="Voice Chat"
            >
              <img src="/icon-speech-to-speech.png" alt="Voice" className="h-4 w-4" />
            </button>
            {typeof props.onToggleLiveMode === "function" ? (
              <button
                onClick={props.onToggleLiveMode}
                disabled={props.isLoading}
                className={`h-8 w-8 rounded-lg transition-all active:scale-95 flex items-center justify-center ${
                  props.isLiveMode
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={props.isLiveMode ? "Live OFF" : "Live ON"}
              >
                <AudioLines className={`h-4 w-4 ${props.isLiveMode ? "animate-pulse" : ""}`} />
              </button>
            ) : null}
            {typeof props.onToggleTextLiveMode === "function" ? (
              <button
                onClick={props.onToggleTextLiveMode}
                disabled={props.isLoading}
                className={`h-8 w-8 rounded-lg transition-all active:scale-95 flex items-center justify-center ${
                  props.isTextLiveMode
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={props.isTextLiveMode ? "Live text OFF" : "Live text ON"}
              >
                <Sparkles className={`h-4 w-4 ${props.isTextLiveMode ? "animate-pulse" : ""}`} />
              </button>
            ) : null}
            {typeof props.onManageKey === "function" ? (
              <button
                onClick={props.onManageKey}
                disabled={props.isLoading}
                className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 flex items-center justify-center"
                title="API key"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
