import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { getAuthedUser } from "../auth-server"

// Mock jwt module
vi.mock("../jwt", () => ({
  verifyJWT: vi.fn(),
}))

import { verifyJWT } from "../jwt"
const mockVerifyJWT = vi.mocked(verifyJWT)

function makeReq(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader) headers["authorization"] = authHeader
  return new NextRequest("http://localhost/api/test", { headers })
}

describe("auth-server", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = "test"
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
  })

  describe("getAuthedUser", () => {
    it("returns null when no authorization header", async () => {
      const result = await getAuthedUser(makeReq())
      expect(result).toBeNull()
    })

    it("returns null when authorization header is empty", async () => {
      const result = await getAuthedUser(makeReq(""))
      expect(result).toBeNull()
    })

    it("returns null when Bearer token is empty", async () => {
      const result = await getAuthedUser(makeReq("Bearer "))
      expect(result).toBeNull()
    })

    it("resolves test_token_ in non-production env", async () => {
      process.env.NODE_ENV = "test"
      const result = await getAuthedUser(makeReq("Bearer test_token_doctor_001"))
      expect(result).not.toBeNull()
      expect(result?.user_id).toBe("doctor_001")
      expect(result?.role).toBe("doctor")
    })

    it("returns null for unknown test_token_ id", async () => {
      process.env.NODE_ENV = "test"
      const result = await getAuthedUser(makeReq("Bearer test_token_nonexistent_id"))
      expect(result).toBeNull()
    })

    it("returns null for test_token_ in production env", async () => {
      process.env.NODE_ENV = "production"
      // JWT verify will fail for test_token_, so it goes to CPU fallback which also fails
      mockVerifyJWT.mockResolvedValueOnce(null)
      // fetch will fail (no CPU server in test)
      const result = await getAuthedUser(makeReq("Bearer test_token_doctor_001"))
      expect(result).toBeNull()
      process.env.NODE_ENV = "test"
    })

    it("resolves valid JWT payload", async () => {
      mockVerifyJWT.mockResolvedValueOnce({
        user_id: "u-123",
        role: "patient",
        username: "pat.test",
        full_name: "Patient Test",
      } as any)

      const result = await getAuthedUser(makeReq("Bearer some.valid.jwt"))
      expect(result).not.toBeNull()
      expect(result?.user_id).toBe("u-123")
      expect(result?.role).toBe("patient")
      expect(result?.username).toBe("pat.test")
      expect(result?.full_name).toBe("Patient Test")
      expect(mockVerifyJWT).toHaveBeenCalledWith("some.valid.jwt")
    })

    it("falls through to CPU server when JWT invalid", async () => {
      mockVerifyJWT.mockResolvedValueOnce(null)
      // CPU server not running → fetch throws → returns null
      const result = await getAuthedUser(makeReq("Bearer invalid.jwt.token"))
      expect(result).toBeNull()
    })
  })
})
