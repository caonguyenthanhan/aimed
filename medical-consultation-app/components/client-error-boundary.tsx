"use client"

import React from "react"

type Props = {
  children: React.ReactNode
}

type State = {
  error: Error | null
  show: boolean
}

export class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, show: false }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    try {
      if (typeof window !== "undefined") {
        const payload = {
          name: error?.name || "Error",
          message: error?.message || "",
          stack: error?.stack || "",
          path: window.location?.pathname || "",
          ts: new Date().toISOString(),
        }
        localStorage.setItem("mcs_last_client_error_v1", JSON.stringify(payload))
      }
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-3xl mx-auto p-4">
          <div className="rounded-xl border bg-background p-4 space-y-2">
            <div className="text-sm font-medium">Có lỗi khi tải trang</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{this.state.error.message}</div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs underline text-muted-foreground"
                onClick={() => this.setState(s => ({ ...s, show: !s.show }))}
                type="button"
              >
                {this.state.show ? "Ẩn chi tiết" : "Xem chi tiết"}
              </button>
              <div className="text-xs text-muted-foreground">Mở DevTools Console để xem chi tiết.</div>
            </div>
            {this.state.show ? (
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                {String(this.state.error.stack || this.state.error.name || "").trim()}
              </div>
            ) : null}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
