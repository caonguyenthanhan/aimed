"use client"

import { MessageSquare, Plus, RefreshCcw, Search, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ConversationItem = {
  id: string
  title: string
  last_active: string
}

interface ConversationHistoryPanelProps {
  mobile?: boolean
  authToken: string | null
  systemState: {
    db_ok: boolean | null
    db_latency_ms?: number | null
  }
  showSearch: boolean
  search: string
  conversations: ConversationItem[]
  conversationId: string | null
  isLoading: boolean
  serverUnavailable: boolean
  onToggleSearch: () => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  onNewConversation: () => void
  onRefresh: () => void
  onClose?: () => void
  onOpenConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
  onDeleteConversation: (id: string) => void
}

export function ConversationHistoryPanel({
  mobile = false,
  authToken,
  systemState,
  showSearch,
  search,
  conversations,
  conversationId,
  isLoading,
  serverUnavailable,
  onToggleSearch,
  onSearchChange,
  onClearSearch,
  onNewConversation,
  onRefresh,
  onClose,
  onOpenConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationHistoryPanelProps) {
  const visibleItems = search
    ? conversations.filter((item) => (item.title || "").toLowerCase().includes(search.toLowerCase()))
    : conversations

  return (
    <div className={cn("flex h-full min-h-0 flex-col", mobile ? "bg-background" : "glass-panel dark:glass-panel-dark border-r border-border/70")}>
      <div className={cn("border-b border-border/70", mobile ? "px-4 py-3" : "px-3 py-3")}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-foreground">Lịch sử tư vấn</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Consultation Hub
              </span>
              {authToken ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                    systemState.db_ok === true
                      ? "bg-teal-accent/10 text-teal-accent"
                      : systemState.db_ok === false
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  db:
                  {" "}
                  {systemState.db_ok === true
                    ? `ok${typeof systemState.db_latency_ms === "number" ? ` ${systemState.db_latency_ms}ms` : ""}`
                    : systemState.db_ok === false
                      ? "down"
                      : "pending"}
                </span>
              ) : null}
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn("flex items-center gap-2", mobile ? "px-4 py-3" : "px-3 py-3")}>
        <button
          type="button"
          onClick={onToggleSearch}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground transition hover:text-foreground"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNewConversation}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Tư vấn mới
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground transition hover:text-foreground"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {showSearch ? (
        <div className={cn(mobile ? "px-4 pb-2" : "px-3 pb-2")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm hội thoại..."
              className="input-glow w-full rounded-2xl border border-border/70 bg-card px-10 py-2.5 text-sm outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn("custom-scrollbar flex-1 space-y-2 overflow-y-auto", mobile ? "px-4 pb-6" : "px-3 pb-3")}>
        {isLoading ? (
          <div className="rounded-2xl bg-secondary/70 px-4 py-6 text-sm text-muted-foreground">Đang tải hội thoại...</div>
        ) : serverUnavailable ? (
          <div className="rounded-2xl bg-secondary/70 px-4 py-6 text-sm text-muted-foreground">Đang dùng local cache.</div>
        ) : visibleItems.length ? (
          visibleItems.map((item) => {
            const active = conversationId === item.id
            return (
              <div
                key={item.id}
                className={cn(
                  "group app-surface rounded-[1.15rem] bg-card/90 p-3 transition",
                  active ? "border-primary/15 bg-primary/5" : "hover-lift",
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenConversation(item.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn("truncate text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                        {item.title || "Chưa có tiêu đề"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.last_active ? new Date(item.last_active).toLocaleString("vi-VN") : "Mới tạo"}
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onRenameConversation(item.id, item.title || "")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition hover:text-foreground"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteConversation(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl bg-secondary/70 px-4 py-6 text-sm text-muted-foreground">
            {search ? "Không tìm thấy hội thoại phù hợp." : "Chưa có hội thoại nào."}
          </div>
        )}
      </div>
    </div>
  )
}
