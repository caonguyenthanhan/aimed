import { sanitizeTtsText } from "../tts-text"

describe("tts-text medical vi", () => {
  test("normalizes blood pressure and mmHg", () => {
    const out = sanitizeTtsText("Huyết áp 120/80 mmHg.", { lang: "vi" })
    expect(out).toContain("120 trên 80")
    expect(out).toContain("mi li mét thủy ngân")
  })

  test("normalizes mg/dL and mmol/L", () => {
    const out = sanitizeTtsText("Glucose 110mg/dL, natri 140 mmol/L.", { lang: "vi" })
    expect(out).toContain("110 mi li gam trên đề xi lít")
    expect(out).toContain("140 mi li mol trên lít")
  })

  test("normalizes common dosage units", () => {
    const out = sanitizeTtsText("Uống paracetamol 500mg, nước 250mL.", { lang: "vi" })
    expect(out).toContain("500 mi li gam")
    expect(out).toContain("250 mi li lít")
  })

  test("does not apply vi medical normalization for non-vi lang", () => {
    const out = sanitizeTtsText("Take 500mg paracetamol.", { lang: "en" })
    expect(out).toContain("500mg")
    expect(out).not.toContain("mi li gam")
  })
})

