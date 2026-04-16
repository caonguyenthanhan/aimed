# 🧪 AI Consultation System - Test Examples

## Scenario Detection & Response Examples

### Example 1: Acute Chest Pain (CRITICAL)

**User Input:**
```
Tôi bị đau ngực, tim đập rất nhanh, khó thở
```

**System Detection:**
- ✅ Scenario: `acute_chest_pain`
- ✅ Consultation Style: `urgent`
- ✅ Risk Level: `CRITICAL`

**AI Response Flow:**
1. **Explanation:** "Đau ngực kèm khó thở là dấu hiệu cảnh báo của bệnh tim. Đây là tình huống cấp tính..."
2. **Investigation:**
   - "Đau ngực từ khi nào? Đột ngột hay từ từ?"
   - "Bạn có bị buồn nôn, ra mồ hôi, hoặc mệt không?"
   - "Bạn có tiền sử bệnh tim không?"
3. **Tool Suggestions:**
   - 🚨 **CRITICAL WARNING:** "GỌI 115 NGAY nếu đau ngực liên tục > 15 phút + khó thở"
   - ✅ Ask Navigation: `tra-cuu` (medical lookup)
   - ✅ Ask Navigation: `bac-si` (doctor appointment)

**Recommended Tools:**
- ❌ Music recommendations (không phù hợp)
- ✅ Immediate medical consultation
- ✅ Emergency hotline information

---

### Example 2: Anxiety & Panic (PSYCHOLOGICAL)

**User Input:**
```
Tôi cảm thấy lo âu mọi lúc, tim đập nhanh, khó thở
```

**System Detection:**
- ✅ Scenario: `anxiety_panic`
- ✅ Consultation Style: `psychological`
- ✅ Risk Level: `MEDIUM`

**AI Response Flow:**
1. **Explanation:** "Lo âu là bình thường, nhưng khi kéo dài có thể ảnh hưởng sức khỏe. Triệu chứp bạn nêu là dấu hiệu lo âu..."
2. **Investigation:**
   - "Lo âu từ khi nào? Có sự kiện gì xảy ra không?"
   - "Bạn sợ cái gì cụ thể?"
   - "Bạn có bị cơn hoảng sợ không? Cảm giác như thế nào?"
3. **Tool Suggestions:**
   - ✅ Ask Navigation: `sang-loc` (GAD-7 screening)
   - ✅ Ask Navigation: `tri-lieu` (therapy exercises)
   - ✅ Recommend Music: Calming playlist
   - ✅ Embed: Therapy mini-component

**Auto-Recommended Actions:**
```json
{
  "actions": [
    {
      "type": "recommend_music",
      "args": {
        "mood": "calm",
        "recommendations": [
          { "videoId": "ZHf2bTjvXr0", "title": "Relaxing Piano Music" },
          { "videoId": "cjVVmezr-t8", "title": "Peaceful Meditation Music" }
        ],
        "message": "Hãy nghe một số bài nhạc thư giãn để giảm lo âu"
      }
    },
    {
      "type": "ask_navigation",
      "args": {
        "feature": "sang-loc",
        "reason": "Bạn có muốn thử bài đánh giá GAD-7 không?"
      }
    }
  ]
}
```

---

### Example 3: Chronic Disease - Diabetes (CHRONIC)

**User Input:**
```
Tôi bị tiểu đường, đường huyết vẫn cao dù đã dùng thuốc
```

**System Detection:**
- ✅ Scenario: `diabetes_management`
- ✅ Consultation Style: `chronic`
- ✅ Risk Level: `HIGH`

**AI Response Flow:**
1. **Explanation:** "Tiểu đường cần quản lý dài hạn. Đường huyết cao có thể do..."
2. **Investigation:**
   - "Bạn bị type 1 hay type 2?"
   - "Bạn đang dùng thuốc nào? Dùng đều không?"
   - "Đường huyết của bạn thường bao nhiêu?"
   - "Bạn có tuân thủ chế độ ăn không?"
   - "Bạn đã kiểm tra cholesterol, huyết áp gần đây không?"
3. **Tool Suggestions:**
   - ✅ Ask Navigation: `tra-cuu` (medical information)
   - ✅ Ask Navigation: `ke-hoach` (treatment plan)
   - ✅ Ask Navigation: `bac-si` (diabetes specialist)

**Special Behavior:**
- 📊 Asks about adherence to medication
- 🏥 Recommends regular doctor visits
- 📋 Suggests monitoring plan and follow-up tests
- ⚠️ Warns about complications if blood sugar not controlled

---

### Example 4: Mental Health - Severe Depression (PSYCHOLOGICAL CRISIS)

**User Input:**
```
Tôi không muốn sống nữa, tôi có ý định tự tử
```

**System Detection:**
- ✅ Scenario: `depression_severe`
- ✅ Consultation Style: `psychological`
- ✅ Risk Level: `CRITICAL`

**AI Response Flow:**
1. **IMMEDIATE CRISIS RESPONSE:**
   - 🚨 "Đây là tình huống khẩn cấp!"
   - 📞 "Hãy gọi ngay 115 hoặc 116 (tâm lý xã hội)"
   - 💬 "Hãy nói chuyện với ai đó bạn tin tưởng"

2. **Professional Questions:**
   - "Bạn có kế hoạch cụ thể tự tử không?"
   - "Bạn đã từng cố gắng tự tử trước đây không?"
   - "Có ai trong gia đình hoặc bạn bè bạn có thể liên hệ không?"

3. **Immediate Actions:**
   - 🚨 Emergency hotlines
   - 👨‍⚕️ Direct to psychologist
   - 💬 Continue supportive conversation
   - NO music recommendations (không phù hợp)

---

### Example 5: Preventive Screening (PREVENTIVE)

**User Input:**
```
Tôi 45 tuổi, gia đình bị ung thư, muốn khám sức khỏe định kỳ
```

**System Detection:**
- ✅ Scenario: `preventive_checkup`
- ✅ Consultation Style: `preventive`
- ✅ Risk Level: `LOW`

**AI Response Flow:**
1. **Explanation:** "Khám định kỳ rất quan trọng, đặc biệt khi có tiền sử gia đình..."
2. **Investigation:**
   - "Tuổi bạn 45, nên khám gì?"
   - "Bạn nam hay nữ? (để tầm soát phù hợp)"
   - "Gia đình bị ung thư loại gì? Khi nào?"
   - "Bạn có hút thuốc, uống rượu không?"
3. **Tool Suggestions:**
   - ✅ Ask Navigation: `sang-loc` (screening tests)
   - ✅ Ask Navigation: `bac-si` (find doctor)
   - ✅ Ask Navigation: `ke-hoach` (health plan)

**Recommended Tests (by AI):**
- For 45-year-old male: Cholesterol, Blood pressure, Prostate cancer screening (PSA), Cancer screening based on family history
- For 45-year-old female: Cholesterol, Blood pressure, Breast cancer screening (mammogram), Cancer screening based on family history

---

### Example 6: Sleep Issues (PSYCHOLOGICAL SUPPORT)

**User Input:**
```
Tôi mất ngủ từ 3 tháng, khó đi vào giấc ngủ
```

**System Detection:**
- ✅ Scenario: `insomnia`
- ✅ Consultation Style: `psychological`
- ✅ Risk Level: `MEDIUM`

**AI Response Flow:**
1. **Explanation:** "Mất ngủ kéo dài có thể ảnh hưởng sức khỏe. Nguyên nhân có thể là..."
2. **Investigation:**
   - "Mất ngủ từ 3 tháng, nguyên nhân là gì?"
   - "Bạn khó đi vào giấc ngủ hay thức giữa đêm?"
   - "Bạn ngủ bao nhiêu giờ mỗi đêm?"
   - "Bạn có lo âu hoặc stress khi đi ngủ không?"
   - "Bạn sử dụng điện thoại trước ngủ không?"

3. **Tool Suggestions:**
   - ✅ Recommend Music: Sleep music playlist
   - ✅ Ask Navigation: `tri-lieu` (relaxation exercises)
   - ✅ Ask Navigation: `tam-su` (talk to AI companion)
   - ✅ Ask Navigation: `sang-loc` (if suspect mental health issue)

**Auto-Recommended Actions:**
```json
{
  "actions": [
    {
      "type": "recommend_music",
      "args": {
        "mood": "sleep",
        "recommendations": [
          { "videoId": "Js8Qf4vGI70", "title": "Calming Sleep Music" },
          { "videoId": "sleep_sample_2", "title": "Nature Sounds - Rain" }
        ],
        "message": "Đây là nhạc giúp ngủ tốt hơn"
      }
    },
    {
      "type": "embed",
      "args": {
        "feature": "tri-lieu",
        "context": { "type": "sleep_relaxation" }
      }
    }
  ]
}
```

---

### Example 7: Medication Side Effects (GENERAL HEALTH)

**User Input:**
```
Tôi dùng thuốc cao huyết áp nhưng bị buồn nôn liên tục, tác dụng phụ hơi nặng
```

**System Detection:**
- ✅ Scenario: `medication_side_effects`
- ✅ Consultation Style: `general`
- ✅ Risk Level: `MEDIUM`

**AI Response Flow:**
1. **Explanation:** "Tác dụng phụ là phần thường xảy ra, nhưng nếu nặng cần thay đổi..."
2. **Investigation:**
   - "Bạn dùng thuốc nào?"
   - "Tác dụng phụ bắt đầu từ khi nào?"
   - "Cảm thấy buồn nôn thường xuyên hay thỉnh thoảng?"
   - "Bạn có dị ứng với bất kỳ thuốc nào không?"
3. **Tool Suggestions:**
   - ✅ Ask Navigation: `tra-cuu` (drug information)
   - ✅ Ask Navigation: `bac-si` (consult doctor about alternatives)

---

## 📊 System Behavior Summary

| Scenario Type | Tone | Actions | Tools | Music |
|---------------|------|---------|-------|-------|
| **Urgent** | Alert, Professional | Ask, Navigate, Emergency | Medical lookup, Doctor | ❌ No |
| **Psychological Crisis** | Supportive, Alert | Ask, Emergency | Psychologist, Hotline | ❌ No |
| **Psychological Support** | Warm, Supportive | Ask, Suggest, Recommend | Therapy, Screening | ✅ Yes |
| **Chronic** | Professional, Long-term | Ask, Educate, Plan | Doctor, Plan, Lookup | ⚠️ Maybe |
| **Preventive** | Encouraging, Informative | Suggest, Plan | Screening, Doctor, Plan | ❌ No |
| **General Health** | Informative, Helpful | Ask, Suggest | Lookup, Doctor | ⚠️ Maybe |

---

## 🔍 How Scenario Detection Works

### Keyword Matching:
```typescript
// AI analyzes user message for keywords
"Tôi bị lo âu" → matches ["lo âu", "lo lắng", "bất an"]
→ Detected: anxiety_panic scenario

"Tôi bị đau ngực + khó thở" → matches ["đau ngực", "khó thở"]
→ Detected: acute_chest_pain scenario
→ Risk Level: CRITICAL
→ Action: Alert user to call 115
```

### Risk Assessment:
```
- Has "tự tử" keyword? → CRITICAL
- Has chest pain + breathing? → CRITICAL
- Has chronic disease? → HIGH
- Has psychological keywords? → MEDIUM
- Normal health question? → LOW
```

---

## 💾 Response Metadata

Every AI response includes:
```json
{
  "metadata": {
    "patientScenarioId": "anxiety_panic",
    "patientScenarioName": "Lo Âu & Hoảng Sợ",
    "consultationStyle": "psychological",
    "riskLevel": "medium",
    "hasInvestigation": true,
    "duration_ms": 1234
  }
}
```

This helps developers track which scenarios are most common and improve responses over time.

---

## 🚀 Future Enhancements

1. **Multilingual Support:** English, Chinese, Japanese
2. **Wearable Integration:** Heart rate, sleep data integration
3. **Appointment Tracking:** Follow-up reminders
4. **Video Consultation:** AI-recommended doctors
5. **Medication Reminders:** Smart notification system
6. **Family Health Records:** Shared health profiles
