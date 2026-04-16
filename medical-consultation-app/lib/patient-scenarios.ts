/**
 * Patient Scenarios & Consultation Context Detection
 * Hệ thống phát hiện tình huống bệnh nhân để điều chỉnh AI tư vấn thích hợp
 */

export interface PatientScenario {
  id: string
  name: string
  description: string
  keywords: string[]
  consultationStyle: 'urgent' | 'preventive' | 'psychological' | 'general' | 'chronic'
  recommendedTools: string[]
  followUpQuestions: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  examples: string[]
}

export const PATIENT_SCENARIOS: Record<string, PatientScenario> = {
  // === TÌNH HUỐNG CẤPỎNG: Triệu chứng cấp tính nguy hiểm ===
  acute_chest_pain: {
    id: 'acute_chest_pain',
    name: 'Đau Ngực Cấp Tính',
    description: 'Bệnh nhân trình bày đau ngực đột ngột, có thể liên quan đến tim',
    keywords: ['đau ngực', 'tim đập nhanh', 'khó thở', 'tức ngực', 'áp lực ngực'],
    consultationStyle: 'urgent',
    recommendedTools: ['tra-cuu', 'bac-si', 'sao-lui-do'],
    followUpQuestions: [
      'Đau ngực bắt đầu từ khi nào? Đột ngột hay từ từ?',
      'Đau ở đâu? Bên trái, bên phải, hay giữa?',
      'Bạn có khó thở, buồn nôn, hoặc ra mồ hôi không?',
      'Bạn có tiền sử bệnh tim, cao huyết áp, hoặc bệnh tiểu đường không?',
      '⚠️ Nếu đau ngực liên tục > 15 phút + khó thở: GỌI 115 NGAY'
    ],
    riskLevel: 'critical',
    examples: [
      'Tôi bị đau ngực, tim đập rất nhanh',
      'Tôi có cảm giác tức ngực từ sáng',
      'Bị đau ngực và khó thở'
    ]
  },

  acute_abdominal_pain: {
    id: 'acute_abdominal_pain',
    name: 'Đau Bụng Cấp Tính',
    description: 'Bệnh nhân trình bày đau bụng đột ngột, có thể là viêm ruột thừa, đó',
    keywords: ['đau bụng', 'đau ruột', 'đau hạ vị', 'đau quanh rốn', 'sưng bụng'],
    consultationStyle: 'urgent',
    recommendedTools: ['tra-cuu', 'bac-si'],
    followUpQuestions: [
      'Đau bụng từ khi nào? Đột ngột hay từ từ?',
      'Đau vùng nào? (trên, dưới, trái, phải, giữa)',
      'Bạn có bị sốt, nôn, tiêu chảy, hoặc tiếp không?',
      'Đau là cơn hay liên tục?',
      '⚠️ Nếu đau rất dữ + sốt cao + nôn: GỌI 115 NGAY'
    ],
    riskLevel: 'critical',
    examples: [
      'Tôi đau bụng dưới bên phải, không thể đi được',
      'Bị đau bụng + sốt cao + nôn liên tục',
      'Đau giữa bụng, rất dữ dội'
    ]
  },

  // === TÌNH HUỐNG SỬC KHỎE TÂM THẦN ===
  depression_severe: {
    id: 'depression_severe',
    name: 'Trầm Cảm Nặng',
    description: 'Bệnh nhân trình bày triệu chứng trầm cảm nặng, có ý tưởng tự tử',
    keywords: ['tuyệt vọng', 'không có hy vọng', 'muốn chết', 'vô nghĩa', 'tự tử', 'sống vô ích'],
    consultationStyle: 'psychological',
    recommendedTools: ['sang-loc', 'bac-si', 'tam-su'],
    followUpQuestions: [
      'Bạn có ý tưởng tự tử không?',
      'Bạn đã từng cố gắng tự tử bao giờ không?',
      'Bạn có kế hoạch tự tử không?',
      'Có người thân hoặc bạn bè bạn có thể chia sẻ không?',
      '⚠️ Nếu có nguy hiểm tức thì: GỌI 115 hoặc tìm bác sĩ tâm lý ngay'
    ],
    riskLevel: 'critical',
    examples: [
      'Tôi không muốn sống nữa',
      'Tôi có ý định tự tử',
      'Tôi cảm thấy tuyệt vọng, không thấy hy vọng nào'
    ]
  },

  anxiety_panic: {
    id: 'anxiety_panic',
    name: 'Lo Âu & Hoảng Sợ',
    description: 'Bệnh nhân trình bày triệu chứng lo âu, cơn hoảng sợ',
    keywords: ['lo âu', 'hoảng sợ', 'sợ', 'bất an', 'tim đập mạnh', 'thở không ra hơi', 'shock'],
    consultationStyle: 'psychological',
    recommendedTools: ['sang-loc', 'tri-lieu', 'tam-su'],
    followUpQuestions: [
      'Lo âu từ khi nào? Có sự kiện gì xảy ra không?',
      'Bạn cảm thấy sợ cái gì cụ thể?',
      'Bạn có bị cơn hoảng sợ không? Đó là cảm giác như thế nào?',
      'Các triệu chứp gồm gì? (tim đập nhanh, khó thở, chóng mặt...)',
      'Bạn đã có cách nào để giảm lo âu không?'
    ],
    riskLevel: 'medium',
    examples: [
      'Tôi cảm thấy lo âu mọi lúc',
      'Tôi bị cơn hoảng sợ, tim đập rất nhanh',
      'Tôi sợ mất kiểm soát trong cơn hoảng sợ'
    ]
  },

  // === TÌNH HUỐNG BỆNH MẠN TÍNH ===
  diabetes_management: {
    id: 'diabetes_management',
    name: 'Quản Lý Bệnh Tiểu Đường',
    description: 'Bệnh nhân bị tiểu đường, cần hỗ trợ quản lý',
    keywords: ['tiểu đường', 'đường huyết', 'insulin', 'glucose', 'glucose cao'],
    consultationStyle: 'chronic',
    recommendedTools: ['tra-cuu', 'ke-hoach', 'bac-si'],
    followUpQuestions: [
      'Bạn bị tiểu đường type 1 hay type 2?',
      'Bạn đang dùng thuốc gì? (insulin, metformin...)',
      'Đường huyết của bạn thường bao nhiêu?',
      'Bạn có tuân thủ chế độ ăn uống không?',
      'Bạn đã kiểm tra cholesterol và huyết áp gần đây không?'
    ],
    riskLevel: 'high',
    examples: [
      'Tôi bị tiểu đường, đường huyết vẫn cao',
      'Làm sao để quản lý tiểu đường tốt hơn?',
      'Tôi bị tiểu đường type 2, cần chế độ ăn nào?'
    ]
  },

  hypertension_management: {
    id: 'hypertension_management',
    name: 'Quản Lý Cao Huyết Áp',
    description: 'Bệnh nhân bị cao huyết áp, cần hỗ trợ quản lý',
    keywords: ['cao huyết áp', 'huyết áp cao', 'huyết áp', 'tăng huyết áp'],
    consultationStyle: 'chronic',
    recommendedTools: ['tra-cuu', 'ke-hoach', 'bac-si'],
    followUpQuestions: [
      'Huyết áp của bạn thường bao nhiêu?',
      'Bạn có triệu chứp gì? (đầu nặng, chóng mặt, mệt...)',
      'Bạn đang dùng thuốc huyết áp nào?',
      'Bạn có tuân thủ chế độ ăn mặn không?',
      'Bạn có tập thể dục đều đặn không?'
    ],
    riskLevel: 'high',
    examples: [
      'Tôi bị cao huyết áp, huyết áp thường 150/90',
      'Tôi bị đau đầu liên tục, huyết áp cao',
      'Làm sao để kiểm soát huyết áp?'
    ]
  },

  // === TÌNH HUỐNG MẤT NGỦ ===
  insomnia: {
    id: 'insomnia',
    name: 'Mất Ngủ',
    description: 'Bệnh nhân trình bày tình trạng mất ngủ kéo dài',
    keywords: ['mất ngủ', 'không ngủ được', 'thức đêm', 'ngủ không sâu', 'ngủ rất ít'],
    consultationStyle: 'psychological',
    recommendedTools: ['tri-lieu', 'tam-su', 'sang-loc'],
    followUpQuestions: [
      'Bạn mất ngủ từ khi nào?',
      'Bạn khó đi vào giấc ngủ hay thức giữa đêm?',
      'Bạn ngủ bao nhiêu giờ mỗi đêm?',
      'Bạn có lo âu hoặc stress khi đi ngủ không?',
      'Bạn có dùng điện thoại, xem TV trước khi ngủ không?'
    ],
    riskLevel: 'medium',
    examples: [
      'Tôi mất ngủ từ 3 tháng nay',
      'Tôi khó đi vào giấc ngủ, thường mất 2-3 giờ',
      'Tôi ngủ chỉ 3-4 giờ mỗi đêm'
    ]
  },

  // === TÌNH HUỐNG CẢM LẠNH/CỬ ===
  common_cold_flu: {
    id: 'common_cold_flu',
    name: 'Cảm Lạnh & Cúm',
    description: 'Bệnh nhân trình bày triệu chứp cảm lạnh hoặc cúm',
    keywords: ['cảm', 'cúm', 'sốt', 'ho', 'hắt hơi', 'chảy nước mũi', 'sore throat', 'đau họng'],
    consultationStyle: 'general',
    recommendedTools: ['tra-cuu', 'bac-si'],
    followUpQuestions: [
      'Bạn có bị sốt không? Nhiệt độ bao nhiêu?',
      'Bạn ho, hắt hơi, hay chảy nước mũi?',
      'Bạn có đau họng, đau người, hoặc mệt không?',
      'Triệu chứp từ bao lâu?',
      'Bạn đã tiêm vắc xin cúm năm nay chưa?'
    ],
    riskLevel: 'low',
    examples: [
      'Tôi bị sốt, ho, chảy nước mũi',
      'Tôi có cảm lạnh từ 3 ngày',
      'Tôi đau họng, sốt 38 độ, có phải cúm không?'
    ]
  },

  // === TÌNH HUỐNG STRESS & KIỆT SỨC ===
  burnout_stress: {
    id: 'burnout_stress',
    name: 'Kiệt Sức & Stress Công Việc',
    description: 'Bệnh nhân trình bày triệu chứp kiệt sức, stress từ công việc',
    keywords: ['kiệt sức', 'stress', 'mệt', 'không có năng lượng', 'quá tải', 'áp lực'],
    consultationStyle: 'psychological',
    recommendedTools: ['tam-su', 'tri-lieu', 'sang-loc'],
    followUpQuestions: [
      'Bạn cảm thấy mệt từ khi nào?',
      'Áp lực công việc như thế nào?',
      'Bạn có ngủ đủ không?',
      'Bạn đã lấy ngày nghỉ không?',
      'Bạn có cách nào để thư giãn không?'
    ],
    riskLevel: 'medium',
    examples: [
      'Tôi cảm thấy kiệt sức vì công việc',
      'Tôi mệt mỏi, không có năng lượng để làm gì',
      'Tôi bị stress quá nhiều từ làm việc'
    ]
  },

  // === TÌNH HUỐNG BÀI KIỂM TRA ĐỊNH KỲ ===
  preventive_checkup: {
    id: 'preventive_checkup',
    name: 'Khám Sức Khỏe Định Kỳ',
    description: 'Bệnh nhân muốn khám sức khỏe định kỳ, phòng ngừa bệnh',
    keywords: ['khám sức khỏe', 'khám định kỳ', 'phòng ngừa', 'sàng lọc', 'check-up'],
    consultationStyle: 'preventive',
    recommendedTools: ['sang-loc', 'bac-si', 'ke-hoach'],
    followUpQuestions: [
      'Tuổi bạn bao nhiêu?',
      'Bạn có tiền sử bệnh nào không?',
      'Bạn lần cuối khám sức khỏe khi nào?',
      'Gia đình bạn có bệnh gì không? (đối với tầm soát ung thư)',
      'Bạn có hút thuốc, uống rượu thường xuyên không?'
    ],
    riskLevel: 'low',
    examples: [
      'Tôi muốn khám sức khỏe định kỳ',
      'Gia đình có bệnh ung thư, tôi muốn tầm soát',
      'Tôi 45 tuổi, nên khám gì để phòng ngừa bệnh?'
    ]
  },

  // === TÌNH HUỐNG TĂNG CÂN / GIẢM CÂN ===
  weight_management: {
    id: 'weight_management',
    name: 'Quản Lý Cân Nặng',
    description: 'Bệnh nhân muốn giảm cân hoặc tăng cân',
    keywords: ['giảm cân', 'tăng cân', 'béo phì', 'chế độ ăn', 'tập thể dục'],
    consultationStyle: 'general',
    recommendedTools: ['ke-hoach', 'tra-cuu', 'tam-su'],
    followUpQuestions: [
      'Cân nặng hiện tại của bạn là bao nhiêu?',
      'Cân nặng mục tiêu là bao nhiêu?',
      'Bạn có mắc bệnh nào không? (tiểu đường, cao huyết áp...)',
      'Bạn ăn như thế nào? (thường ăn gì)',
      'Bạn tập thể dục bao nhiêu giờ mỗi tuần?'
    ],
    riskLevel: 'low',
    examples: [
      'Tôi muốn giảm 10kg',
      'Tôi bị béo phì, cần giảm cân',
      'Làm sao để tăng cân một cách khỏe mạnh?'
    ]
  },

  // === TÌNH HUỐNG DÙNG THUỐC ===
  medication_side_effects: {
    id: 'medication_side_effects',
    name: 'Tác Dụng Phụ Thuốc',
    description: 'Bệnh nhân báo cáo tác dụng phụ từ thuốc',
    keywords: ['tác dụng phụ', 'thuốc', 'không thể dùng', 'dị ứng', 'phản ứng'],
    consultationStyle: 'general',
    recommendedTools: ['tra-cuu', 'bac-si'],
    followUpQuestions: [
      'Bạn dùng thuốc nào?',
      'Tác dụng phụ bắt đầu từ khi nào?',
      'Các triệu chứp cụ thể là gì?',
      'Bạn có dị ứng với bất kỳ thuốc nào không?',
      'Bạn đã hỏi bác sĩ hay dược sĩ chưa?'
    ],
    riskLevel: 'medium',
    examples: [
      'Tôi bị buồn nôn sau khi uống thuốc',
      'Thuốc này làm tôi mệt, có thể thay đổi được không?',
      'Tôi bị dị ứng với amoxicillin'
    ]
  }
}

// Hàm phát hiện tình huống dựa trên keywords
export function detectPatientScenario(userMessage: string): PatientScenario | null {
  const text = userMessage.toLowerCase()
  
  for (const scenario of Object.values(PATIENT_SCENARIOS)) {
    const matchedKeywords = scenario.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    )
    
    if (matchedKeywords.length >= 1) {
      return scenario
    }
  }
  
  return null
}

// Hàm lấy consultation style cơ bản
export function getConsultationStylePrompt(scenario: PatientScenario | null): string {
  if (!scenario) return ''
  
  const stylePrompts: Record<string, string> = {
    urgent: `
      ⚠️ ĐÂY LÀ TÌNH HUỐNG CẤP TÍNH NGUY HIỂM:
      - Ưu tiên đánh giá mức độ nguy hiểm ngay
      - Nếu có dấu hiệu nguy hiểm, hướng người dùng gọi 115 NGAY
      - Giải thích rõ các triệu chứp cảnh báo (warning signs)
      - Khuyên không tự điều trị mà phải đi bệnh viện
    `,
    psychological: `
      💬 ĐÂY LÀ VẤN ĐỀ TÂMTHẦN:
      - Lắng nghe tôi không phán xét
      - Đặt câu hỏi thêm về cảm xúc, tình trạng hiện tại
      - Gợi ý các công cụ hỗ trợ tâm lý (screening, therapy)
      - Khuyến khích tìm bác sĩ tâm lý nếu cần
    `,
    chronic: `
      🏥 ĐÂY LÀ BỆNH MẠNHÍNH:
      - Tập trung vào quản lý dài hạn
      - Hỏi về tuân thủ điều trị, chế độ ăn, tập thể dục
      - Gợi ý kế hoạch quản lý và theo dõi định kỳ
      - Khuyến khích tương tác với bác sĩ chuyên khoa
    `,
    preventive: `
      🛡️ ĐÂY LÀ PHÒNG NGỪA BỆNH:
      - Tập trung vào các bài sàng lọc phù hợp theo tuổi/giới tính
      - Khuyến khích thay đổi lối sống tích cực
      - Gợi ý các xét nghiệm/khám cần thiết
      - Cải thiện yếu tố nguy hiểm
    `,
    general: `
      ℹ️ ĐÂY LÀ TÌNH HUỐNG CHUNG:
      - Giải thích rõ nguyên nhân và cách xử lý
      - Hỏi thêm về triệu chứp, thời gian, yếu tố gây ra
      - Gợi ý cách chăm sóc tại nhà và khi nào đi bác sĩ
      - Khuyến khích uống nước, nghỉ ngơi, tuân thủ hướng dẫn
    `
  }
  
  return stylePrompts[scenario.consultationStyle] || ''
}

/**
 * Tích hợp vào AI Prompt
 * Gọi detectPatientScenario() để phát hiện tình huống
 * Sau đó thêm getConsultationStylePrompt() vào system prompt
 */
