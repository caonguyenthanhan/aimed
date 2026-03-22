"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import type { Agent } from "@/lib/agent-registry"

interface EmbeddedAgentContainerProps {
  agent: Agent
  onClose: () => void
  initialData?: any
}

/**
 * Embedded Agent Container - displays agent content within chat response
 * Hiển thị nội dung agent trực tiếp trong cuộc trò chuyện
 */
export function EmbeddedAgentContainer({
  agent,
  onClose,
  initialData
}: EmbeddedAgentContainerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAgentContent = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch agent-specific endpoint
        const response = await fetch(`/api/agents/${agent.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialData })
        })

        if (!response.ok) {
          throw new Error(`Failed to load ${agent.name}`)
        }

        const data = await response.json()
        setContent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadAgentContent()
  }, [agent.id, initialData])

  return (
    <Card className="border-blue-200 bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{agent.name}</CardTitle>
          <CardDescription>{agent.description}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Đang tải {agent.name}...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            <p className="font-semibold">Lỗi</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.href = agent.route}
            >
              Mở trang đầy đủ
            </Button>
          </div>
        ) : content ? (
          <div className="space-y-4">
            {/* Agent-specific content rendering */}
            {typeof content === 'string' ? (
              <p>{content}</p>
            ) : (
              <AgentContentRenderer agent={agent} content={content} />
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Không có nội dung
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Render content based on agent type
 * Hiển thị nội dung tùy theo loại agent
 */
function AgentContentRenderer({ agent, content }: { agent: Agent; content: any }) {
  switch (agent.id) {
    case 'health_screening':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Kết quả sàng lọc</h4>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
          </div>
        </div>
      )

    case 'symptom_checker':
      return (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Phân tích triệu chứng</h4>
            {content.symptoms && (
              <div className="text-sm space-y-2">
                <p><strong>Triệu chứng:</strong> {content.symptoms.join(', ')}</p>
                {content.diagnosis && <p><strong>Chẩn đoán khả năng:</strong> {content.diagnosis}</p>}
                {content.recommendation && <p><strong>Khuyến cáo:</strong> {content.recommendation}</p>}
              </div>
            )}
          </div>
        </div>
      )

    case 'medication_info':
      return (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Thông tin thuốc</h4>
            {content.name && (
              <div className="text-sm space-y-2">
                <p><strong>Tên thuốc:</strong> {content.name}</p>
                {content.dosage && <p><strong>Liều dùng:</strong> {content.dosage}</p>}
                {content.side_effects && <p><strong>Tác dụng phụ:</strong> {content.side_effects}</p>}
              </div>
            )}
          </div>
        </div>
      )

    case 'doctor_finder':
      return (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Kết quả tìm kiếm bác sĩ</h4>
            {Array.isArray(content) ? (
              <div className="text-sm space-y-2">
                {content.map((doctor: any, idx: number) => (
                  <div key={idx} className="border-t pt-2 first:border-t-0">
                    <p><strong>{doctor.name}</strong> - {doctor.specialty}</p>
                    <p className="text-gray-600">{doctor.experience} năm kinh nghiệm</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Không tìm thấy bác sĩ phù hợp</p>
            )}
          </div>
        </div>
      )

    default:
      return (
        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )
  }
}
