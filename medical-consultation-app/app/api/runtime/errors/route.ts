/**
 * GET /api/runtime/errors
 * Returns last 50 error events from runtime-errors.jsonl
 * DELETE /api/runtime/errors — clears the log
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getAuthedUser } from "@/lib/auth-server"

const ERRORS_PATH = path.join(process.cwd(), "data", "runtime-errors.jsonl")

function readErrors() {
  if (!fs.existsSync(ERRORS_PATH)) return []
  const raw = fs.readFileSync(ERRORS_PATH, "utf-8")
  return raw.split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l) } catch { return null }
  }).filter(Boolean)
}

export async function GET(req: NextRequest) {
  // WHY: only doctors/admins should see error logs
  const user = await getAuthedUser(req)
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const all = readErrors()
    const last = all.slice(-50)
    const summary = {
      total: all.length,
      errors: all.filter((e: any) => e.level === "error").length,
      warnings: all.filter((e: any) => e.level === "warning").length,
    }
    return NextResponse.json({ summary, events: last })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "read_error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    if (fs.existsSync(ERRORS_PATH)) fs.writeFileSync(ERRORS_PATH, "")
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "clear_error" }, { status: 500 })
  }
}
