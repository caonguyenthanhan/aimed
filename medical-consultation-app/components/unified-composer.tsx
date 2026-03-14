"use client"

import { RefObject } from "react"
import { Send, X, Mic } from "lucide-react"

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

  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
}

export function UnifiedComposer(props: UnifiedComposerProps) {
  const canSend = (!!props.value.trim() || !!props.selectedImage?.base64 || !!props.selectedDocName) && !props.isLoading

  return (
    <div
      className="flex-shrink-0 p-4 glass-panel border-t border-slate-200 relative z-10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <div className="max-w-3xl mx-auto px-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {props.suggestedQuestions.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => props.onSuggestedQuestion(q)}
              className="px-3 py-1.5 rounded-2xl bg-gray-100 text-gray-700 text-xs hover:bg-blue-100 border border-gray-200 hover:border-blue-200 transition-all duration-200"
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
                className="h-24 w-24 md:h-28 md:w-28 rounded-xl object-cover shadow border border-gray-200"
              />
              <button
                onClick={props.onRemoveImage}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow hover:bg-red-600"
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
            <div className="relative inline-block bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 pr-8 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <span className="text-xs font-bold text-blue-600">DOC</span>
                </div>
                <span className="text-sm text-blue-800 font-medium truncate max-w-[150px]">{props.selectedDocName}</span>
              </div>
              <button
                onClick={props.onRemoveDoc}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow hover:bg-red-600"
                title="Xóa tài liệu"
                aria-label="Xóa tài liệu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[24px] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.1)] px-4 py-2 flex items-center gap-2 hover:scale-[1.02] transition-transform">
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
            className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent resize-none py-2 max-h-32 overflow-y-auto"
            style={{ WebkitTapHighlightColor: "transparent", minHeight: "40px" }}
            disabled={props.isLoading}
            rows={1}
          />
          <button
            onClick={props.onSubmit}
            disabled={!canSend}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={props.onToggleTools}
              className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 shadow-sm"
            >
              +
            </button>
            {props.showTools && (
              <div className="flex items-center space-x-2">
                <input ref={props.fileInputRef} type="file" accept="image/*" className="hidden" onChange={props.onImageChange} />
                <button
                  onClick={() => props.fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
                >
                  Thêm ảnh
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
                  className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
                >
                  Thêm PDF/DOC
                </button>
                {props.selectedImage?.name && <span className="text-xs text-gray-600">Ảnh: {props.selectedImage.name}</span>}
                {props.selectedDocName && <span className="text-xs text-gray-600">Tài liệu: {props.selectedDocName}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={props.selectedModel}
              onChange={(e) => props.onSelectedModelChange(e.target.value as UnifiedComposerModel)}
              className="px-3 py-2 border border-gray-200 rounded-2xl text-sm bg-white"
            >
              <option value="flash">flash</option>
              <option value="pro">pro</option>
            </select>
            <button
              onClick={props.onStartNewConversation}
              className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
            >
              new
            </button>
            <button
              onClick={props.onToggleRecording}
              disabled={props.isLoading}
              className={`px-3 py-2 rounded-2xl transition-all duration-200 shadow-md active:scale-95 ${
                props.isRecording ? "bg-red-500 text-white hover:bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={props.isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
            >
              <Mic className={`h-4 w-4 ${props.isRecording ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={props.onGotoSpeechChat}
              className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 shadow-sm"
              title="Chuyển sang Speech-to-Speech"
            >
              <img src="/icon-speech-to-speech.png" alt="Speech-to-Speech" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
