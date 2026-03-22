import { NextRequest, NextResponse } from 'next/server'
import { agentRegistry } from '@/lib/agent-registry'

/**
 * POST /api/agents/[agentId] - Get agent-specific content for embedding
 * Lấy nội dung agent cụ thể để nhúng vào chat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    const body = await request.json()
    const { initialData } = body

    // Verify agent exists
    const agent = agentRegistry.getAgent(agentId as any)
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      )
    }

    // Check if agent is embeddable
    if (!agent.embeddable) {
      return NextResponse.json(
        { error: `Agent ${agentId} is not embeddable` },
        { status: 400 }
      )
    }

    // Route to appropriate handler based on agent type
    const content = await getAgentContent(agentId, initialData)

    return NextResponse.json(content)
  } catch (error) {
    console.error(`Error fetching agent content for ${params.agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch agent content' },
      { status: 500 }
    )
  }
}

/**
 * Get content for specific agent type
 * Lấy nội dung cho loại agent cụ thể
 */
async function getAgentContent(agentId: string, initialData?: any): Promise<any> {
  switch (agentId) {
    case 'health_screening':
      return {
        type: 'form',
        title: 'Khám sàng lọc sức khỏe',
        questions: [
          { id: 'age', label: 'Tuổi', type: 'number' },
          { id: 'gender', label: 'Giới tính', type: 'select', options: ['Nam', 'Nữ'] },
          { id: 'health_issues', label: 'Vấn đề sức khỏe hiện tại', type: 'textarea' }
        ]
      }

    case 'symptom_checker':
      return {
        type: 'symptom_checker',
        title: 'Kiểm tra triệu chứng',
        symptoms: initialData?.symptoms || [],
        analysis: initialData?.symptoms ? await analyzeSymptoms(initialData.symptoms) : null
      }

    case 'medication_info':
      return {
        type: 'information',
        title: 'Thông tin về thuốc',
        message: 'Nhập tên thuốc bạn muốn tìm hiểu'
      }

    case 'doctor_finder':
      return {
        type: 'doctor_list',
        title: 'Tìm kiếm bác sĩ',
        doctors: initialData?.specialty ? await findDoctors(initialData.specialty) : []
      }

    case 'appointment_scheduler':
      return {
        type: 'appointment_form',
        title: 'Đặt lịch hẹn',
        message: 'Vui lòng chọn ngày và giờ hẹn'
      }

    case 'medical_records':
      return {
        type: 'records_list',
        title: 'Hồ sơ y tế',
        message: 'Xem và quản lý hồ sơ y tế của bạn'
      }

    default:
      return { error: 'Unknown agent' }
  }
}

/**
 * Helper: Analyze symptoms
 * Trợ giúp: Phân tích triệu chứng (stub)
 */
async function analyzeSymptoms(symptoms: string[]): Promise<any> {
  // This would integrate with your AI service or medical database
  return {
    symptoms: symptoms,
    diagnosis: 'Cần tư vấn thêm',
    recommendation: 'Vui lòng liên hệ bác sĩ để được tư vấn'
  }
}

/**
 * Helper: Find doctors by specialty
 * Trợ giúp: Tìm bác sĩ theo chuyên khoa (stub)
 */
async function findDoctors(specialty: string): Promise<any[]> {
  // This would query your doctor database
  return [
    {
      id: '1',
      name: 'Bác sĩ Nguyễn Văn A',
      specialty: specialty,
      experience: 10,
      rating: 4.8
    }
  ]
}

/**
 * PUT /api/agents/[agentId]/suggestions - Record user interaction with suggestion
 * Ghi lại cách người dùng tương tác với đề xuất
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const body = await request.json()
    const { suggestionId, selection } = body

    if (!suggestionId || !selection) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Record interaction
    await agentRegistry.recordSuggestionInteraction(suggestionId, selection)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording suggestion interaction:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}
