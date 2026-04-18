import { describe, it, expect, beforeEach, vi } from 'vitest'
import { detectPatientScenario, getConsultationStylePrompt } from '@/lib/patient-scenarios'

describe('Agent Consultation Integration Tests', () => {
  describe('Patient Scenario + Consultation Style Integration', () => {
    it('should create appropriate prompt for chest pain (URGENT)', () => {
      const userMessage = 'Tôi bị đau ngực từ sáng, tim đập nhanh'
      const scenario = detectPatientScenario(userMessage)
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(scenario?.id).toBe('acute_chest_pain')
      expect(prompt).toContain('URGENT')
      expect(prompt).toContain('115')
      expect(prompt).toContain('nguy hiểm')
    })

    it('should create appropriate prompt for anxiety (PSYCHOLOGICAL)', () => {
      const userMessage = 'Tôi cảm thấy lo âu, bất an'
      const scenario = detectPatientScenario(userMessage)
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(scenario?.id).toBe('anxiety_panic')
      expect(prompt).toContain('đồng cảm')
      expect(prompt).toContain('tâm lý')
    })

    it('should create appropriate prompt for diabetes (CHRONIC)', () => {
      const userMessage = 'Tôi bị tiểu đường type 2'
      const scenario = detectPatientScenario(userMessage)
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(scenario?.id).toBe('diabetes_management')
      expect(prompt).toContain('dài hạn')
      expect(prompt).toContain('quản lý')
    })

    it('should create appropriate prompt for cold/flu (GENERAL)', () => {
      const userMessage = 'Tôi sốt 39 độ, ho'
      const scenario = detectPatientScenario(userMessage)
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(scenario?.id).toBe('cold_flu')
      expect(prompt).toContain('bình thường')
    })

    it('should include risk level in consultation style', () => {
      const criticalMessage = 'Tôi muốn tự tử'
      const criticalScenario = detectPatientScenario(criticalMessage)
      expect(criticalScenario?.riskLevel).toBe('critical')

      const mediumMessage = 'Tôi cảm thấy lo âu'
      const mediumScenario = detectPatientScenario(mediumMessage)
      expect(mediumScenario?.riskLevel).toBe('medium')
    })
  })

  describe('Metadata Response Verification', () => {
    it('should include patient scenario metadata in response', () => {
      const userMessage = 'Tôi bị đau ngực'
      const scenario = detectPatientScenario(userMessage)
      
      const metadata = {
        patientScenarioId: scenario?.id,
        patientScenarioName: scenario?.name,
        consultationStyle: scenario?.consultationStyle,
        riskLevel: scenario?.riskLevel,
      }
      
      expect(metadata.patientScenarioId).toBe('acute_chest_pain')
      expect(metadata.patientScenarioName).toBe('Đau Ngực Cấp Tính')
      expect(metadata.consultationStyle).toBe('urgent')
      expect(metadata.riskLevel).toBe('critical')
    })

    it('should not break response when no scenario detected', () => {
      const userMessage = 'Xin chào'
      const scenario = detectPatientScenario(userMessage)
      
      expect(scenario).toBeNull()
      
      // Response should still be valid even if scenario is null
      const metadata = {
        patientScenarioId: scenario?.id || null,
        patientScenarioName: scenario?.name || 'General',
      }
      
      expect(metadata.patientScenarioId).toBeNull()
      expect(metadata.patientScenarioName).toBe('General')
    })
  })

  describe('Multi-turn Conversation Scenario Detection', () => {
    it('should detect escalating severity in depression case', () => {
      const conversation = [
        'Tôi cảm thấy buồn',
        'Tôi không muốn gặp ai',
        'Tôi có ý tưởng tự tử'
      ]
      
      const scenarios = conversation.map(msg => detectPatientScenario(msg))
      
      // Last message should trigger depression_severe
      expect(scenarios[scenarios.length - 1]?.id).toBe('depression_severe')
      expect(scenarios[scenarios.length - 1]?.riskLevel).toBe('critical')
    })

    it('should maintain context for chronic disease management', () => {
      const conversation = [
        'Tôi bị tiểu đường',
        'Đường huyết tôi cao',
        'Tôi muốn kiểm soát tốt hơn'
      ]
      
      const scenarios = conversation.map(msg => detectPatientScenario(msg))
      
      // All should be diabetes management
      scenarios.forEach(scenario => {
        expect(scenario?.id).toBe('diabetes_management')
      })
    })

    it('should handle scenario transitions (cold to potential complication)', () => {
      const conversation = [
        { msg: 'Tôi sốt, ho', expectedId: 'cold_flu' },
        { msg: 'Sốt 40 độ, khó thở', expectedId: 'cold_flu' },
        { msg: 'Bây giờ tôi đau ngực', expectedId: 'acute_chest_pain' }
      ]
      
      conversation.forEach(({ msg, expectedId }) => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe(expectedId)
      })
    })
  })

  describe('Recommendation Tools Alignment', () => {
    it('should recommend appropriate tools for acute scenarios', () => {
      const scenarios = [
        { msg: 'Tôi bị đau ngực', expectedTools: ['tra-cuu', 'bac-si'] },
        { msg: 'Tôi bị đau bụng', expectedTools: ['tra-cuu', 'bac-si'] }
      ]
      
      scenarios.forEach(({ msg, expectedTools }) => {
        const scenario = detectPatientScenario(msg)
        expectedTools.forEach(tool => {
          expect(scenario?.recommendedTools).toContain(tool)
        })
      })
    })

    it('should recommend therapy and screening for mental health', () => {
      const scenario = detectPatientScenario('Tôi lo âu')
      expect(scenario?.recommendedTools).toContain('sang-loc')
      expect(scenario?.recommendedTools).toContain('tri-lieu')
    })

    it('should recommend doctor for chronic conditions', () => {
      const scenario = detectPatientScenario('Tôi bị cao huyết áp')
      expect(scenario?.recommendedTools).toContain('bac-si')
    })
  })

  describe('Follow-up Questions in Context', () => {
    it('should provide context-aware follow-up questions', () => {
      const scenarios = [
        {
          msg: 'Tôi bị đau ngực',
          shouldInclude: ['khi nào', 'đột ngột', 'khó thở']
        },
        {
          msg: 'Tôi lo âu',
          shouldInclude: ['bao giờ', 'sợ', 'triệu chứng']
        },
        {
          msg: 'Tôi bị tiểu đường',
          shouldInclude: ['quản lý', 'thuốc', 'chế độ ăn']
        }
      ]
      
      scenarios.forEach(({ msg, shouldInclude }) => {
        const scenario = detectPatientScenario(msg)
        const prompt = getConsultationStylePrompt(scenario)
        
        shouldInclude.forEach(keyword => {
          // Either in scenario questions or in prompt
          const inQuestions = scenario?.followUpQuestions.some(q => 
            q.toLowerCase().includes(keyword.toLowerCase())
          )
          const inPrompt = prompt.toLowerCase().includes(keyword.toLowerCase())
          
          expect(inQuestions || inPrompt).toBe(true)
        })
      })
    })
  })

  describe('Risk Level Based Response Routing', () => {
    it('should flag CRITICAL scenarios for priority handling', () => {
      const criticalMessages = [
        'Tôi bị đau ngực',
        'Tôi muốn tự tử',
        'Tôi đau bụng + sốt cao + nôn'
      ]
      
      criticalMessages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.riskLevel).toBe('critical')
      })
    })

    it('should flag HIGH risk for chronic conditions', () => {
      const highRiskMessages = [
        'Tôi bị tiểu đường',
        'Tôi bị cao huyết áp'
      ]
      
      highRiskMessages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.riskLevel).toBe('high')
      })
    })

    it('should flag MEDIUM risk for psychiatric conditions', () => {
      const mediumRiskMessages = [
        'Tôi lo âu',
        'Tôi mất ngủ',
        'Tôi stress'
      ]
      
      mediumRiskMessages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.riskLevel).toBe('medium')
      })
    })

    it('should flag LOW risk for common illnesses', () => {
      const lowRiskMessages = [
        'Tôi sốt',
        'Tôi muốn giảm cân'
      ]
      
      lowRiskMessages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.riskLevel).toBe('low')
      })
    })
  })

  describe('Emergency Response Validation', () => {
    it('critical scenarios should include emergency hotline in follow-up', () => {
      const criticalScenarios = ['acute_chest_pain', 'acute_abdominal_pain', 'depression_severe']
      
      criticalScenarios.forEach(scenarioId => {
        const scenario = Object.values(PATIENT_SCENARIOS).find(s => s.id === scenarioId)
        const hasEmergency = scenario?.followUpQuestions.some(q => 
          q.includes('115') || q.includes('tự tử') || q.includes('nguy hiểm')
        )
        expect(hasEmergency).toBe(true)
      })
    })

    it('should provide emergency resources in consultation prompt', () => {
      const scenario = detectPatientScenario('Tôi bị đau ngực cực kỳ đau')
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt.toLowerCase()).toMatch(/115|cấp cứu|khẩn cấp|ngay|nguy hiểm/)
    })
  })

  describe('Consultation Quality Standards', () => {
    it('all scenarios should have complete metadata', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.id).toBeDefined()
        expect(scenario.name).toBeDefined()
        expect(scenario.description).toBeDefined()
        expect(scenario.keywords).toBeDefined()
        expect(scenario.consultationStyle).toBeDefined()
        expect(scenario.recommendedTools).toBeDefined()
        expect(scenario.followUpQuestions).toBeDefined()
        expect(scenario.riskLevel).toBeDefined()
        expect(scenario.examples).toBeDefined()
      })
    })

    it('scenarios should have diverse and complete keywords', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.keywords.length).toBeGreaterThanOrEqual(3)
        scenario.keywords.forEach(keyword => {
          expect(keyword.length).toBeGreaterThan(0)
        })
      })
    })

    it('scenarios should have practical examples', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.examples.length).toBeGreaterThan(0)
        scenario.examples.forEach(example => {
          expect(example.length).toBeGreaterThan(5)
        })
      })
    })
  })

  describe('Vietnamese Language Support', () => {
    it('should handle Vietnamese accents correctly', () => {
      const tests = [
        { msg: 'Tôi đau ngực', expected: 'acute_chest_pain' },
        { msg: 'Tôi đau ngực', expected: 'acute_chest_pain' },
        { msg: 'Tôi bị cao huyết áp', expected: 'hypertension' },
      ]
      
      tests.forEach(({ msg, expected }) => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe(expected)
      })
    })

    it('should support colloquial Vietnamese expressions', () => {
      const colloquialMessages = [
        'Tôi đang bị đau ngực lắm',
        'Mình lo âu quá',
        'Tôi sốt cao tuyệt'
      ]
      
      colloquialMessages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario).toBeDefined()
      })
    })
  })

  describe('Performance Characteristics', () => {
    it('should detect scenarios quickly for large messages', () => {
      const largeMessage = 'Tôi bị đau ngực ' + 'description '.repeat(100)
      const start = performance.now()
      const scenario = detectPatientScenario(largeMessage)
      const duration = performance.now() - start
      
      expect(scenario?.id).toBe('acute_chest_pain')
      expect(duration).toBeLessThan(100) // Should complete in less than 100ms
    })

    it('should handle multiple scenario keywords efficiently', () => {
      // Message with keywords from multiple scenarios
      const complexMessage = 'Tôi bị đau ngực, lo âu, mất ngủ, và muốn giảm cân'
      const scenario = detectPatientScenario(complexMessage)
      
      // Should prioritize critical/urgent scenarios
      expect(scenario?.riskLevel).toBe('critical')
    })
  })
})
