/**
 * JWT utility — sign and verify tokens using jose (Edge-compatible).
 * Secret loaded from JWT_SECRET env var (must be set in production).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose"

export interface AppJWTPayload extends JWTPayload {
  user_id: string
  role: string
  username?: string
  full_name?: string
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // WHY: fail loudly in production; dev fallback only to avoid blocking local start
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET env var is required in production")
    }
    return new TextEncoder().encode("dev-insecure-secret-change-me")
  }
  return new TextEncoder().encode(secret)
}

/**
 * Sign a JWT token valid for 7 days.
 * @param payload - user data to embed
 * @returns signed JWT string
 */
export async function signJWT(payload: Omit<AppJWTPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

/**
 * Verify and decode a JWT token.
 * Returns null if invalid/expired instead of throwing.
 * @param token - raw JWT string (without "Bearer " prefix)
 */
export async function verifyJWT(token: string): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const p = payload as AppJWTPayload
    if (!p.user_id || !p.role) return null
    return p
  } catch {
    return null
  }
}
