import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const modePath = path.join(dataDir, 'runtime-mode.json')
const eventsPath = path.join(dataDir, 'runtime-events.jsonl')

function ensure() {
  if (process.env.VERCEL) return
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(modePath)) fs.writeFileSync(modePath, JSON.stringify({ target: 'cpu', updated_at: new Date().toISOString() }))
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '')
}

export async function GET() {
  try {
    ensure()
    if (process.env.VERCEL) {
      const gpuBase = (process.env.GPU_SERVER_URL || '').trim().replace(/\/$/, '')
      const cpuBase = (process.env.CPU_SERVER_URL || '').trim().replace(/\/$/, '')
      if (gpuBase) return NextResponse.json({ target: 'gpu', gpu_url: gpuBase, updated_at: new Date().toISOString() })
      if (cpuBase) return NextResponse.json({ target: 'cpu', updated_at: new Date().toISOString() })
      return NextResponse.json({ target: 'cpu', updated_at: new Date().toISOString() })
    }
    const raw = fs.readFileSync(modePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'read_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    ensure()
    const body = await req.json()
    const target = body?.target === 'gpu' ? 'gpu' : 'cpu'
    const gpu_url = target === 'gpu' && typeof body?.gpu_url === 'string' ? body.gpu_url : undefined
    const now = new Date().toISOString()
    const payload: any = { target, gpu_url, updated_at: now }
    if (!process.env.VERCEL) {
      fs.writeFileSync(modePath, JSON.stringify(payload, null, 2))
      fs.appendFileSync(eventsPath, JSON.stringify({ type: 'mode_change', target, gpu_url, ts: now }) + '\n')
    }
    try {
      const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '')
      await fetch(`${backendUrl}/v1/runtime/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    } catch {}
    return NextResponse.json({ ok: true, mode: payload })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'write_error' }, { status: 500 })
  }
}
