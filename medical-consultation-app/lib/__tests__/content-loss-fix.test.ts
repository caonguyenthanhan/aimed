/**
 * Integration tests for content loss fixes
 */

import { describe, it, expect } from 'vitest'
import { planChunkedMessages, verifyContentIntegrity } from '../chat-delivery'

describe('Content Loss Fix - Integration Tests', () => {
  describe('planChunkedMessages preserves content', () => {
    it('should preserve full content for short text', () => {
      const text = 'Đây là một câu trả lời ngắn.'
      const result = planChunkedMessages(text)
      
      expect(result.length).toBeGreaterThan(0)
      const reconstructed = result.map(m => m.content).join('\n\n')
      expect(reconstructed).toContain('Đây là một câu trả lời ngắn')
    })

    it('should preserve content for long text with multiple paragraphs', () => {
      const text = `Đau đầu là một trong những triệu chứng phổ biến của cảm cúm.

Tuy nhiên, đau đầu cũng có thể xuất hiện do nhiều nguyên nhân khác nhau. Nếu bạn chỉ bị đau đầu đơn thuần mà không có các triệu chứng khác của cảm cúm như sốt, đau mỏi cơ hoặc ho, thì có thể đó không phải là cảm cúm.

Để xác định chính xác tình trạng của bạn, tôi khuyên bạn nên:

1. Theo dõi các triệu chứng khác
2. Uống đủ nước
3. Nghỉ ngơi đầy đủ
4. Nếu triệu chứng kéo dài, hãy đi khám bác sĩ`
      
      const result = planChunkedMessages(text)
      expect(result.length).toBeGreaterThan(0)
      
      const reconstructed = result.map(m => m.content).join('\n\n')
      
      // Check all key phrases are preserved
      expect(reconstructed).toContain('Đau đầu')
      expect(reconstructed).toContain('cảm cúm')
      expect(reconstructed).toContain('Theo dõi')
      expect(reconstructed).toContain('Uống đủ nước')
      expect(reconstructed).toContain('khám bác sĩ')
    })

    it('should preserve content when exceeding maxMessages', () => {
      const text = Array.from({ length: 20 }, (_, i) => 
        `Điểm ${i + 1}: Đây là một câu khá dài để kiểm tra việc tách thành các chunk riêng biệt. ${i + 1}`
      ).join('\n\n')
      
      const result = planChunkedMessages(text, { maxMessages: 3, maxCharsPerMessage: 200 })
      expect(result.length).toBeGreaterThan(0)
      
      const reconstructed = result.map(m => m.content).join('\n\n')
      
      // Should contain first and last points
      expect(reconstructed).toContain('Điểm 1')
      expect(reconstructed).toContain('Điểm 20')
    })

    it('should not return empty chunks', () => {
      const text = 'Một câu trả lời. Tiếp theo là khác. Và sau cùng.'
      const result = planChunkedMessages(text)
      
      expect(result.length).toBeGreaterThan(0)
      result.forEach(chunk => {
        expect(chunk.content).toBeTruthy()
        expect(chunk.content.trim().length).toBeGreaterThan(0)
      })
    })
  })

  describe('verifyContentIntegrity', () => {
    it('should verify content is preserved', () => {
      const original = 'Đây là nội dung gốc cần kiểm tra. Nó có nhiều câu. Tất cả đều quan trọng.'
      const chunked = [
        { content: 'Đây là nội dung gốc cần kiểm tra.', kind: 'text' as const, delay_ms: 0 },
        { content: 'Nó có nhiều câu. Tất cả đều quan trọng.', kind: 'text' as const, delay_ms: 450 }
      ]
      
      const result = verifyContentIntegrity(original, chunked)
      expect(result).toBe(true)
    })

    it('should detect missing content', () => {
      const original = 'Nội dung gốc với từ quan trọng ở đây'
      const chunked = [
        { content: 'Nội dung gốc', kind: 'text' as const, delay_ms: 0 }
      ]
      
      const result = verifyContentIntegrity(original, chunked)
      expect(result).toBe(false)
    })

    it('should handle empty chunks gracefully', () => {
      const original = 'Nội dung test'
      const chunked: any[] = [
        { content: '', kind: 'text' }
      ]
      
      const result = verifyContentIntegrity(original, chunked)
      expect(result).toBe(false)
    })
  })

  describe('Delay calculations', () => {
    it('should calculate correct delays for multiple chunks', () => {
      const text = 'Đây là câu 1.\n\nĐây là câu 2.\n\nĐây là câu 3.'
      const result = planChunkedMessages(text)
      
      expect(result[0].delay_ms).toBe(0)
      result.slice(1).forEach(chunk => {
        expect(chunk.delay_ms).toBe(450)
      })
    })

    it('should handle empty input gracefully', () => {
      const result = planChunkedMessages('')
      expect(result).toEqual([])
    })

    it('should handle whitespace-only input', () => {
      const result = planChunkedMessages('   \n\n   ')
      expect(result).toEqual([])
    })
  })
})
