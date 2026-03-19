export type TherapeuticCard = {
  id: string
  title: string
  body: string
  tag: "mindfulness" | "cbt" | "selfcare"
}

export const THERAPEUTIC_CARDS: TherapeuticCard[] = [
  { id: "m1", tag: "mindfulness", title: "Hít thở 4-6", body: "Hít vào 4 giây, thở ra 6 giây. Lặp 6 lần. Chỉ cần quay về nhịp thở là đủ." },
  { id: "m2", tag: "mindfulness", title: "Neo 5 giác quan", body: "Nhìn 5 thứ, chạm 4 thứ, nghe 3 âm thanh, ngửi 2 mùi, nếm 1 vị. Trở về hiện tại." },
  { id: "c1", tag: "cbt", title: "Tên gọi cảm xúc", body: "Gọi tên 1 cảm xúc chính bạn đang có. Cảm xúc không phải sự thật; nó là tín hiệu." },
  { id: "c2", tag: "cbt", title: "Bằng chứng ủng hộ & phản biện", body: "Viết 1 câu lo lắng. Liệt kê 2 bằng chứng ủng hộ và 2 bằng chứng phản biện. Chọn câu cân bằng hơn." },
  { id: "c3", tag: "cbt", title: "Một bước nhỏ", body: "Chọn 1 hành động nhỏ trong 5 phút giúp bạn tốt hơn 1%. Làm ngay rồi quay lại." },
  { id: "s1", tag: "selfcare", title: "Uống nước", body: "Uống 1 ly nước. Cơ thể ổn hơn thì tâm trí cũng dễ thở hơn." },
  { id: "s2", tag: "selfcare", title: "Đi bộ 10 phút", body: "Đi chậm 10 phút. Chú ý nhịp chân và hơi thở." },
  { id: "s3", tag: "selfcare", title: "Nhật ký 3 dòng", body: "Hôm nay mình thấy gì? Điều gì khó? Một điều nhỏ mình làm được?" },
]

const KEY_PREFIX = "mcs_therapeutic_card_"

function todayKey() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function getDailyCard(seed: string) {
  const day = todayKey()
  const key = `${KEY_PREFIX}${day}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const id = String(raw).trim()
      const found = THERAPEUTIC_CARDS.find((c) => c.id === id)
      if (found) return { day, card: found }
    }
  } catch {}
  const idx = THERAPEUTIC_CARDS.length ? hashString(`${seed}|${day}`) % THERAPEUTIC_CARDS.length : 0
  const card = THERAPEUTIC_CARDS[idx] || THERAPEUTIC_CARDS[0]
  try {
    if (card) localStorage.setItem(key, card.id)
  } catch {}
  return { day, card }
}

export function redrawToday(seed: string) {
  const day = todayKey()
  const key = `${KEY_PREFIX}${day}`
  const idx = THERAPEUTIC_CARDS.length ? hashString(`${seed}|${day}|${Date.now()}`) % THERAPEUTIC_CARDS.length : 0
  const card = THERAPEUTIC_CARDS[idx] || THERAPEUTIC_CARDS[0]
  try {
    if (card) localStorage.setItem(key, card.id)
  } catch {}
  return { day, card }
}

