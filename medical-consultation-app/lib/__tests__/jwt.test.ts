import { describe, it, expect, beforeEach } from "vitest"
import { signJWT, verifyJWT } from "../jwt"

describe("jwt", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
  })

  describe("signJWT + verifyJWT round-trip", () => {
    it("returns valid payload after sign+verify", async () => {
      const token = await signJWT({ user_id: "u1", role: "patient" })
      expect(typeof token).toBe("string")
      expect(token.split(".").length).toBe(3)

      const payload = await verifyJWT(token)
      expect(payload).not.toBeNull()
      expect(payload?.user_id).toBe("u1")
      expect(payload?.role).toBe("patient")
    })

    it("includes optional fields when provided", async () => {
      const token = await signJWT({
        user_id: "d1",
        role: "doctor",
        username: "dr.test",
        full_name: "Dr. Test",
      })
      const payload = await verifyJWT(token)
      expect(payload?.username).toBe("dr.test")
      expect(payload?.full_name).toBe("Dr. Test")
    })
  })

  describe("verifyJWT", () => {
    it("returns null for random string", async () => {
      const result = await verifyJWT("not.a.jwt")
      expect(result).toBeNull()
    })

    it("returns null for empty string", async () => {
      const result = await verifyJWT("")
      expect(result).toBeNull()
    })

    it("returns null for token signed with wrong secret", async () => {
      // Sign with different secret
      const { SignJWT } = await import("jose")
      const wrongSecret = new TextEncoder().encode("wrong-secret-totally-different")
      const badToken = await new SignJWT({ user_id: "x", role: "patient" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(wrongSecret)

      const result = await verifyJWT(badToken)
      expect(result).toBeNull()
    })

    it("returns null for token missing user_id", async () => {
      const { SignJWT } = await import("jose")
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      const token = await new SignJWT({ role: "patient" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret)

      const result = await verifyJWT(token)
      expect(result).toBeNull()
    })

    it("returns null for expired token", async () => {
      const { SignJWT } = await import("jose")
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      // WHY: jose requires seconds granularity; set exp to 1 second in the past
      const expiredAt = Math.floor(Date.now() / 1000) - 10
      const token = await new SignJWT({ user_id: "u1", role: "patient" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiredAt)
        .sign(secret)

      const result = await verifyJWT(token)
      expect(result).toBeNull()
    })
  })
})
