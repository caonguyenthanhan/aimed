export class IdleBuffer {
  private idleMs: number
  private timer: any
  private chunks: string[]
  private onFlush: (text: string) => void | Promise<void>

  constructor(opts: { idleMs: number; onFlush: (text: string) => void | Promise<void> }) {
    this.idleMs = Math.max(0, Number(opts.idleMs))
    this.onFlush = opts.onFlush
    this.timer = null
    this.chunks = []
  }

  add(text: string) {
    const t = String(text || "").trim()
    if (!t) return
    this.chunks.push(t)
    this.reset()
  }

  clear() {
    this.chunks = []
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  async flushNow() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const payload = this.chunks.map((s) => String(s || "").trim()).filter(Boolean).join("\n").trim()
    this.chunks = []
    if (!payload) return
    await this.onFlush(payload)
  }

  private reset() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      void this.flushNow()
    }, this.idleMs)
  }
}

