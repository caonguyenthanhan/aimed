// Agent Registry System
// Quản lý danh sách các module agent và các cách để tương tác với chúng

import { getNeonPool } from './neon-db'

export type AgentType = 
  | 'doctor_finder' 
  | 'health_screening' 
  | 'symptom_checker' 
  | 'medication_info' 
  | 'appointment_scheduler' 
  | 'medical_records'
  | 'sang_loc'
  | 'tri_lieu'
  | 'tra_cuu'
  | 'bac_si'
  | 'ke_hoach'
  | 'thong_ke'
  | 'tam_su'
  | 'music_therapy'

export interface Agent {
  id: AgentType
  name: string
  description: string
  icon?: string
  category: 'diagnosis' | 'consultation' | 'information' | 'scheduling' | 'records'
  route: string
  embeddable: boolean // Can be embedded in chat response
  hasApiEndpoint: boolean // Has dedicated API endpoint
  metadata?: Record<string, any>
}

export interface AgentSuggestion {
  id: string
  conversation_id: string
  agent_id: string
  reason: string
  suggested_at: Date
  user_selected?: 'embed' | 'link' | 'ignored'
}

/**
 * Agent Registry maintains centralized agent configuration
 * Allows both full-page navigation and embedded chat integration
 * Theo dõi đề xuất agent và cách người dùng tương tác
 */
export class AgentRegistry {
  private pool = getNeonPool()
  private agents: Map<AgentType, Agent> = new Map()

  constructor() {
    this.initializeDefaultAgents()
  }

  private initializeDefaultAgents(): void {
    const defaultAgents: Agent[] = [
      {
        id: 'doctor_finder',
        name: 'Tìm Bác Sĩ',
        description: 'Tìm kiếm và kết nối với các bác sĩ chuyên khoa',
        category: 'consultation',
        route: '/agents/doctor-finder',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'stethoscope' }
      },
      {
        id: 'health_screening',
        name: 'Khám Sàng Lọc Sức Khỏe',
        description: 'Kiểm tra sức khỏe toàn diện với các câu hỏi có cấu trúc',
        category: 'diagnosis',
        route: '/agents/health-screening',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'heart' }
      },
      {
        id: 'symptom_checker',
        name: 'Kiểm Tra Triệu Chứng',
        description: 'Phân tích triệu chứng và gợi ý chẩn đoán ban đầu',
        category: 'diagnosis',
        route: '/agents/symptom-checker',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'thermometer' }
      },
      {
        id: 'medication_info',
        name: 'Thông Tin Thuốc',
        description: 'Cung cấp thông tin chi tiết về các loại thuốc',
        category: 'information',
        route: '/agents/medication-info',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'pill' }
      },
      {
        id: 'appointment_scheduler',
        name: 'Lịch Hẹn',
        description: 'Đặt lịch hẹn với bác sĩ',
        category: 'scheduling',
        route: '/agents/appointment-scheduler',
        embeddable: false, // Usually needs full page
        hasApiEndpoint: true,
        metadata: { icon: 'calendar' }
      },
      {
        id: 'medical_records',
        name: 'Hồ Sơ Y Tế',
        description: 'Quản lý và xem các hồ sơ y tế cá nhân',
        category: 'records',
        route: '/agents/medical-records',
        embeddable: false,
        hasApiEndpoint: true,
        metadata: { icon: 'file' }
      },
      // New embeddable agents for consultation hub
      {
        id: 'sang_loc',
        name: 'Sàng Lọc Tâm Lý',
        description: 'Đánh giá sức khỏe tâm thần với các bài test chuẩn (PHQ-9, GAD-7, DASS-21)',
        category: 'diagnosis',
        route: '/sang-loc',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'clipboard-check', featureId: 'sang-loc' }
      },
      {
        id: 'tri_lieu',
        name: 'Trị Liệu & Thư Giãn',
        description: 'Bài tập thở, thiền định và kỹ thuật giảm stress',
        category: 'consultation',
        route: '/tri-lieu',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'heart-pulse', featureId: 'tri-lieu' }
      },
      {
        id: 'tra_cuu',
        name: 'Tra Cứu Thuốc/Bệnh',
        description: 'Tìm kiếm thông tin chi tiết về thuốc và các bệnh lý',
        category: 'information',
        route: '/tra-cuu',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'search', featureId: 'tra-cuu' }
      },
      {
        id: 'bac_si',
        name: 'Tìm & Đặt Lịch Bác Sĩ',
        description: 'Tìm bác sĩ phù hợp và đặt lịch hẹn khám',
        category: 'scheduling',
        route: '/bac-si',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'user-md', featureId: 'bac-si' }
      },
      {
        id: 'ke_hoach',
        name: 'Kế Hoạch Chăm Sóc',
        description: 'Lập kế hoạch và theo dõi tiến trình sức khỏe cá nhân',
        category: 'records',
        route: '/ke-hoach',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'calendar-check', featureId: 'ke-hoach' }
      },
      {
        id: 'thong_ke',
        name: 'Thống Kê Sức Khỏe',
        description: 'Xem báo cáo và phân tích dữ liệu sức khỏe của bạn',
        category: 'records',
        route: '/thong-ke',
        embeddable: true,
        hasApiEndpoint: true,
        metadata: { icon: 'chart-bar', featureId: 'thong-ke' }
      },
      {
        id: 'tam_su',
        name: 'Tâm Sự',
        description: 'Trò chuyện và chia sẻ cảm xúc với AI đồng cảm',
        category: 'consultation',
        route: '/tam-su',
        embeddable: false, // Tâm sự không embed, luôn mở trang riêng
        hasApiEndpoint: true,
        metadata: { icon: 'message-heart', featureId: 'tam-su', hasMusic: true }
      },
      {
        id: 'music_therapy',
        name: 'Liệu Pháp Âm Nhạc',
        description: 'Nghe nhạc thư giãn và chữa lành tâm hồn',
        category: 'consultation',
        route: '/tam-su',
        embeddable: true, // Music player có thể embed vào chat Tâm sự
        hasApiEndpoint: false,
        metadata: { icon: 'music', forTamSu: true }
      }
    ]

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent)
    })
  }

  /**
   * Get agent by ID
   * Lấy agent theo ID
   */
  getAgent(agentId: AgentType): Agent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all agents
   * Lấy tất cả các agent
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agents by category
   * Lấy agent theo danh mục
   */
  getAgentsByCategory(category: 'diagnosis' | 'consultation' | 'information' | 'scheduling' | 'records'): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.category === category)
  }

  /**
   * Get embeddable agents only
   * Lấy các agent có thể nhúng vào chat
   */
  getEmbeddableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.embeddable)
  }

  /**
   * Store agent suggestion in database
   * Lưu trữ đề xuất agent trong cơ sở dữ liệu
   */
  async suggestAgent(
    conversationId: string,
    agentId: AgentType,
    reason: string
  ): Promise<AgentSuggestion> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO agent_suggestions 
         (conversation_id, agent_id, reason, suggested_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [conversationId, agentId, reason]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Record user's interaction with agent suggestion
   * Ghi lại cách người dùng tương tác với đề xuất
   */
  async recordSuggestionInteraction(
    suggestionId: string,
    selection: 'embed' | 'link' | 'ignored'
  ): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `UPDATE agent_suggestions 
         SET user_selected = $1
         WHERE id = $2`,
        [selection, suggestionId]
      )
    } finally {
      client.release()
    }
  }

  /**
   * Get suggestions for a conversation
   * Lấy các đề xuất cho một cuộc hội thoại
   */
  async getSuggestionsForConversation(conversationId: string): Promise<AgentSuggestion[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM agent_suggestions 
         WHERE conversation_id = $1
         ORDER BY suggested_at DESC`,
        [conversationId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get agent usage statistics
   * Lấy thống kê sử dụng agent
   */
  async getAgentUsageStats(): Promise<Record<string, number>> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT agent_id, COUNT(*) as usage_count
         FROM agent_suggestions
         WHERE user_selected IS NOT NULL
         GROUP BY agent_id`
      )

      const stats: Record<string, number> = {}
      result.rows.forEach(row => {
        stats[row.agent_id] = parseInt(row.usage_count, 10)
      })
      return stats
    } finally {
      client.release()
    }
  }
}

export const agentRegistry = new AgentRegistry()
