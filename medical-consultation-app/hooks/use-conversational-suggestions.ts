import { useState, useCallback } from 'react'
import type { ConversationalAgentSuggestion } from '@/components/conversational-agent-suggestion'
import type { Agent, AgentType } from '@/lib/agent-registry'

/**
 * Hook để quản lý gợi ý agent theo cách hội thoại
 * Hỏi người dùng bằng các câu hỏi tự nhiên thay vì ép đổi trang
 */
export function useConversationalSuggestions() {
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string
      suggestion: ConversationalAgentSuggestion
    }>
  >([])

  // Predefined suggestion templates based on user context
  const suggestionTemplates: Record<string, ConversationalAgentSuggestion> = {
    anxiety_concern: {
      agent: {
        id: 'health_screening',
        name: 'Khám Sàng Lọc Sức Khỏe',
        description: 'Kiểm tra sức khỏe toàn diện',
        category: 'diagnosis',
        route: '/sang-loc',
        embeddable: true,
        hasApiEndpoint: true,
      },
      clarifyingQuestions: [
        'Bạn có muốn kiểm tra sức khỏe toàn diện không?',
        'Liệu bạn có quan tâm đến việc tìm hiểu thêm về chiến lược quản lý lo âu?',
      ],
      suggestedActions: [
        {
          id: 'embed',
          label: 'Sàng lọc ngay trong chat',
          description: 'Trả lời một số câu hỏi để đánh giá sức khỏe của bạn',
        },
        {
          id: 'open-tab',
          label: 'Mở trang sàng lọc đầy đủ',
          description: 'Xem toàn bộ công cụ sàng lọc trong tab riêng',
        },
        {
          id: 'skip',
          label: 'Không cần, cảm ơn',
          description: 'Tiếp tục trò chuyện',
        },
      ],
      reason: 'Sàng lọc sức khỏe có thể giúp bạn hiểu rõ hơn về tình trạng hiện tại',
    },

    symptom_description: {
      agent: {
        id: 'symptom_checker',
        name: 'Kiểm Tra Triệu Chứng',
        description: 'Phân tích triệu chứng và gợi ý chẩn đoán',
        category: 'diagnosis',
        route: '/agents/symptom-checker',
        embeddable: true,
        hasApiEndpoint: true,
      },
      clarifyingQuestions: [
        'Bạn có muốn phân tích chi tiết các triệu chứng của mình không?',
      ],
      suggestedActions: [
        {
          id: 'embed',
          label: 'Phân tích triệu chứng ngay',
          description: 'Sử dụng công cụ kiểm tra triệu chứng',
        },
        {
          id: 'open-tab',
          label: 'Xem công cụ đầy đủ',
          description: 'Mở trong tab mới để có không gian làm việc thoải mái',
        },
      ],
      reason: 'Công cụ kiểm tra triệu chứng có thể giúp bạn xác định các vấn đề sức khỏe tiềm ẩn',
    },

    consultation_needed: {
      agent: {
        id: 'doctor_finder',
        name: 'Tìm Bác Sĩ',
        description: 'Tìm kiếm và kết nối với các bác sĩ chuyên khoa',
        category: 'consultation',
        route: '/agents/doctor-finder',
        embeddable: true,
        hasApiEndpoint: true,
      },
      clarifyingQuestions: [
        'Bạn có muốn tìm bác sĩ chuyên khoa phù hợp không?',
        'Bạn có muốn đặt lịch hẹn ngay hôm nay không?',
      ],
      suggestedActions: [
        {
          id: 'embed',
          label: 'Tìm bác sĩ trong chat',
          description: 'Xem danh sách bác sĩ ngay tại đây',
        },
        {
          id: 'open-tab',
          label: 'Mở công cụ tìm bác sĩ',
          description: 'Tìm kiếm nâng cao và so sánh bác sĩ',
        },
      ],
      reason: 'Việc tham khảo bác sĩ có thể cung cấp cho bạn lời khuyên y tế chuyên sâu',
    },

    medication_inquiry: {
      agent: {
        id: 'medication_info',
        name: 'Thông Tin Thuốc',
        description: 'Cung cấp thông tin chi tiết về các loại thuốc',
        category: 'information',
        route: '/agents/medication-info',
        embeddable: true,
        hasApiEndpoint: true,
      },
      clarifyingQuestions: [
        'Bạn muốn tìm hiểu chi tiết về một loại thuốc cụ thể không?',
      ],
      suggestedActions: [
        {
          id: 'embed',
          label: 'Tìm thông tin thuốc',
          description: 'Tìm kiếm và xem thông tin chi tiết',
        },
        {
          id: 'open-tab',
          label: 'Mở công cụ đầy đủ',
          description: 'Truy cập danh sách thuốc toàn bộ',
        },
      ],
      reason: 'Hiểu biết về thuốc giúp bạn sử dụng chúng an toàn và hiệu quả',
    },

    appointment_needed: {
      agent: {
        id: 'appointment_scheduler',
        name: 'Lịch Hẹn',
        description: 'Đặt lịch hẹn với bác sĩ',
        category: 'scheduling',
        route: '/agents/appointment-scheduler',
        embeddable: false,
        hasApiEndpoint: true,
      },
      clarifyingQuestions: [
        'Bạn muốn đặt lịch hẹn với bác sĩ không?',
        'Bạn có ưu tiên thời gian nào không?',
      ],
      suggestedActions: [
        {
          id: 'navigate',
          label: 'Đặt lịch hẹn ngay',
          description: 'Chọn bác sĩ và thời gian phù hợp',
        },
        {
          id: 'open-tab',
          label: 'Xem lịch hẹn',
          description: 'Kiểm tra các lịch hẹn hiện tại',
        },
      ],
      reason: 'Lên lịch hẹn sớm giúp bạn nhận được chăm sóc y tế kịp thời',
    },
  }

  /**
   * Tạo gợi ý agent từ template
   * Người dùng trả lời các câu hỏi trước khi lựa chọn hành động
   */
  const suggestAgent = useCallback(
    (
      templateKey: keyof typeof suggestionTemplates,
      options?: {
        reason?: string
        clarifyingQuestions?: string[]
        suggestedActions?: Array<{ id: string; label: string; description: string }>
      }
    ) => {
      const template = suggestionTemplates[templateKey]
      if (!template) return null

      const suggestion: ConversationalAgentSuggestion = {
        ...template,
        ...(options?.reason && { reason: options.reason }),
        ...(options?.clarifyingQuestions && {
          clarifyingQuestions: options.clarifyingQuestions,
        }),
        ...(options?.suggestedActions && {
          suggestedActions: options.suggestedActions,
        }),
      }

      const suggestionId = `suggestion-${Date.now()}`
      setSuggestions((prev) => [
        ...prev,
        { id: suggestionId, suggestion },
      ])

      return { id: suggestionId, suggestion }
    },
    []
  )

  /**
   * Xóa gợi ý từ danh sách
   */
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) =>
      prev.filter((s) => s.id !== suggestionId)
    )
  }, [])

  /**
   * Xoá tất cả gợi ý
   */
  const clearAllSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  /**
   * Xử lý khi người dùng chọn hành động
   */
  const handleSuggestionAction = useCallback(
    (
      suggestionId: string,
      actionId: string,
      userResponses?: Record<string, string>
    ) => {
      // Track user interaction with suggestion
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (suggestion) {
        console.log('[v0] Suggestion action:', {
          suggestionId,
          actionId,
          userResponses,
          agent: suggestion.suggestion.agent.id,
        })
        // You can send this to analytics or backend
      }

      // Remove suggestion after interaction
      dismissSuggestion(suggestionId)
    },
    [suggestions, dismissSuggestion]
  )

  return {
    suggestions,
    suggestAgent,
    dismissSuggestion,
    clearAllSuggestions,
    handleSuggestionAction,
    templates: suggestionTemplates,
  }
}
