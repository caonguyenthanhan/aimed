import { getDeviceId } from "@/lib/device-id"

export async function upsertUserState(namespace: string, key: string, value: any) {
  try {
    const deviceId = getDeviceId()
    if (!deviceId) return
    await fetch("/api/user-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      },
      body: JSON.stringify({ namespace, key, value }),
    })
  } catch {}
}

export async function getUserState(namespace: string) {
  try {
    const deviceId = getDeviceId()
    if (!deviceId) return []
    const url = `/api/user-state?namespace=${encodeURIComponent(namespace)}`
    const resp = await fetch(url, { headers: { "x-device-id": deviceId } })
    if (!resp.ok) return []
    const j = await resp.json()
    return Array.isArray(j?.items) ? j.items : []
  } catch {
    return []
  }
}

export async function deleteUserState(namespace: string, key: string) {
  try {
    const deviceId = getDeviceId()
    if (!deviceId) return
    const url = `/api/user-state?namespace=${encodeURIComponent(namespace)}&key=${encodeURIComponent(key)}`
    await fetch(url, { method: "DELETE", headers: { "x-device-id": deviceId } })
  } catch {}
}
