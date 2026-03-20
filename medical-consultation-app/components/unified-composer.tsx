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
      className="flex-shrink-0 p-4 glass-panel dark:glass-panel-dark border-t border-slate-200 dark:border-slate-700 relative z-10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <div className="max-w-3xl mx-auto px-2">
        <div className="mb-3 -mx-2 px-2 flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {props.suggestedQuestions.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => props.onSuggestedQuestion(q)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 font-medium"
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

        <div className="rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center gap-2 transition-all">
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
            className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent dark:text-slate-50 resize-none py-3 max-h-32 overflow-y-auto placeholder-slate-400 dark:placeholder-slate-500"
            style={{ WebkitTapHighlightColor: "transparent", minHeight: "44px" }}
            disabled={props.isLoading}
            rows={1}
          />
          <button
            onClick={props.onSubmit}
            disabled={!canSend}
            className={`flex-shrink-0 p-2.5 rounded-lg transition-all duration-200 ${
              canSend
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={props.onToggleTools}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 font-semibold text-sm"
              aria-label="Bật/Tắt công cụ"
            >
              +
            </button>
            {props.showTools && (
              <div className="flex items-center gap-2">
                <input ref={props.fileInputRef} type="file" accept="image/*" className="hidden" onChange={props.onImageChange} />
                <button
                  onClick={() => props.fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 text-sm"
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
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 text-sm"
                >
                  PDF/Doc
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {typeof props.onToggleAgentMode === "function" ? (
              <button
                onClick={props.onToggleAgentMode}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-semibold ${
                  props.agentMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
                title="Bật/tắt agent mode"
              >
                agent
              </button>
            ) : null}
            <select
              value={props.selectedModel}
              onChange={(e) => props.onSelectedModelChange(e.target.value as UnifiedComposerModel)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            >
              <option value="flash">flash</option>
              <option value="pro">pro</option>
            </select>
            <button
              onClick={props.onStartNewConversation}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 text-sm"
              title="Bắt đầu hội thoại mới"
            >
              new
            </button>
            <button
              onClick={props.onToggleRecording}
              disabled={props.isLoading}
              className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                props.isRecording 
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title={props.isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
            >
              <Mic className={`h-5 w-5 ${props.isRecording ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={props.onGotoSpeechChat}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
              title="Chuyển sang Voice Chat"
            >
              <img src="/icon-speech-to-speech.png" alt="Speech-to-Speech" className="h-5 w-5" />
            </button>
            {typeof props.onToggleLiveMode === "function" ? (
              <button
                onClick={props.onToggleLiveMode}
                disabled={props.isLoading}
                className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                  props.isLiveMode
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={props.isLiveMode ? "Tắt Live mode" : "Bật Live mode"}
              >
                <AudioLines className={`h-5 w-5 ${props.isLiveMode ? "animate-pulse" : ""}`} />
              </button>
            ) : null}
            {typeof props.onToggleTextLiveMode === "function" ? (
              <button
                onClick={props.onToggleTextLiveMode}
                disabled={props.isLoading}
                className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                  props.isTextLiveMode
                    ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={props.isTextLiveMode ? "Tắt Live text" : "Bật Live text"}
              >
                <Sparkles className={`h-5 w-5 ${props.isTextLiveMode ? "animate-pulse" : ""}`} />
              </button>
            ) : null}
            {typeof props.onManageKey === "function" ? (
              <button
                onClick={props.onManageKey}
                disabled={props.isLoading}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95"
                title="Thiết lập API key/pass"
              >
                <KeyRound className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
