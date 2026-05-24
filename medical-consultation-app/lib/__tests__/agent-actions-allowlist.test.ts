import { ALLOWED_PATH_PREFIXES, isAllowedPath } from "../agent-actions"

describe("agent-actions allowlist", () => {
  test("exports stable prefixes", () => {
    expect(ALLOWED_PATH_PREFIXES).toContain("/sang-loc")
    expect(ALLOWED_PATH_PREFIXES).toContain("/tri-lieu")
    expect(ALLOWED_PATH_PREFIXES).toContain("/tra-cuu")
    expect(ALLOWED_PATH_PREFIXES).toContain("/thong-ke")
  })

  test("allows exact match and nested paths", () => {
    expect(isAllowedPath("/sang-loc")).toBe(true)
    expect(isAllowedPath("/sang-loc/abc")).toBe(true)
    expect(isAllowedPath("/tra-cuu/thuoc/abc")).toBe(true)
  })

  test("rejects invalid paths", () => {
    expect(isAllowedPath("sang-loc")).toBe(false)
    expect(isAllowedPath("http://example.com")).toBe(false)
    expect(isAllowedPath("/not-allowed")).toBe(false)
  })
})

