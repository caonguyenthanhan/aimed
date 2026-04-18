import { describe, it, expect } from 'vitest'
import { detectPatientScenario, getConsultationStylePrompt, PATIENT_SCENARIOS } from '@/lib/patient-scenarios'

describe('Patient Scenarios - Smart AI Consultation System', () => {
  describe('Scenario Detection', () => {
    it('should detect ACUTE_CHEST_PAIN when user mentions chest pain', () => {
      const scenario = detectPatientScenario('Tôi bị đau ngực, tim đập nhanh')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('acute_chest_pain')
      expect(scenario?.riskLevel).toBe('critical')
      expect(scenario?.consultationStyle).toBe('urgent')
    })

    it('should detect ACUTE_ABDOMINAL_PAIN with abdomen pain keywords', () => {
      const scenario = detectPatientScenario('Tôi đau bụng dưới bên phải, không thể đi được')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('acute_abdominal_pain')
      expect(scenario?.riskLevel).toBe('critical')
    })

    it('should detect DEPRESSION_SEVERE with suicide ideation keywords', () => {
      const scenario = detectPatientScenario('Tôi không muốn sống nữa, tôi có ý tưởng tự tử')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('depression_severe')
      expect(scenario?.riskLevel).toBe('critical')
      expect(scenario?.consultationStyle).toBe('psychological')
    })

    it('should detect ANXIETY_PANIC with anxiety keywords', () => {
      const scenario = detectPatientScenario('Tôi cảm thấy lo âu, bất an, tim đập mạnh')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('anxiety_panic')
      expect(scenario?.riskLevel).toBe('medium')
      expect(scenario?.consultationStyle).toBe('psychological')
    })

    it('should detect DIABETES_MANAGEMENT with diabetes keywords', () => {
      const scenario = detectPatientScenario('Tôi bị bệnh tiểu đường type 2, đường huyết cao')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('diabetes_management')
      expect(scenario?.riskLevel).toBe('high')
      expect(scenario?.consultationStyle).toBe('chronic')
    })

    it('should detect HYPERTENSION with blood pressure keywords', () => {
      const scenario = detectPatientScenario('Tôi bị cao huyết áp, đầu hoa mắt')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('hypertension')
      expect(scenario?.riskLevel).toBe('high')
      expect(scenario?.consultationStyle).toBe('chronic')
    })

    it('should detect INSOMNIA with sleep disorder keywords', () => {
      const scenario = detectPatientScenario('Tôi mất ngủ được 3 ngày, rất mệt')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('insomnia')
      expect(scenario?.riskLevel).toBe('medium')
      expect(scenario?.consultationStyle).toBe('psychological')
    })

    it('should detect COLD_FLU with common illness keywords', () => {
      const scenario = detectPatientScenario('Tôi sốt 39 độ, ho, viêm họng')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('cold_flu')
      expect(scenario?.riskLevel).toBe('low')
      expect(scenario?.consultationStyle).toBe('general')
    })

    it('should detect BURNOUT_STRESS with stress keywords', () => {
      const scenario = detectPatientScenario('Tôi stress công việc, mệt mỏi, kiệt sức')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('burnout_stress')
      expect(scenario?.riskLevel).toBe('medium')
      expect(scenario?.consultationStyle).toBe('psychological')
    })

    it('should detect WEIGHT_MANAGEMENT with weight keywords', () => {
      const scenario = detectPatientScenario('Tôi thừa cân, muốn giảm cân')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('weight_management')
      expect(scenario?.riskLevel).toBe('low')
      expect(scenario?.consultationStyle).toBe('general')
    })

    it('should return null for unclear/general queries', () => {
      const scenario = detectPatientScenario('Xin chào, tôi là một bệnh nhân mới')
      expect(scenario).toBeNull()
    })

    it('should prioritize CRITICAL risk scenarios', () => {
      // Test that critical scenarios are detected with priority
      const scenario1 = detectPatientScenario('Tôi đau ngực + sốt cao + khó thở')
      expect(scenario1?.riskLevel).toBe('critical')
    })

    it('should handle case-insensitive keyword matching', () => {
      const scenario1 = detectPatientScenario('ĐAU NGỰC')
      const scenario2 = detectPatientScenario('đau ngực')
      expect(scenario1?.id).toBe(scenario2?.id)
    })
  })

  describe('Consultation Style Prompts', () => {
    it('should generate URGENT consultation style for critical cases', () => {
      const scenario = PATIENT_SCENARIOS.acute_chest_pain
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt).toContain('URGENT')
      expect(prompt).toContain('115')
      expect(prompt).toContain('nguy hiểm')
    })

    it('should generate PSYCHOLOGICAL consultation style for mental health', () => {
      const scenario = PATIENT_SCENARIOS.depression_severe
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt).toContain('tâm lý')
      expect(prompt).toContain('đồng cảm')
      expect(prompt).toContain('tự tử')
    })

    it('should generate CHRONIC consultation style for long-term conditions', () => {
      const scenario = PATIENT_SCENARIOS.diabetes_management
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt).toContain('dài hạn')
      expect(prompt).toContain('quản lý')
      expect(prompt).toContain('tuân thủ')
    })

    it('should generate PREVENTIVE consultation style for wellness', () => {
      const scenario = PATIENT_SCENARIOS.weight_management
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt).toContain('phòng ngừa')
      expect(prompt).toContain('sức khỏe')
      expect(prompt).toContain('lối sống')
    })

    it('should generate GENERAL consultation style for common illness', () => {
      const scenario = PATIENT_SCENARIOS.cold_flu
      const prompt = getConsultationStylePrompt(scenario)
      
      expect(prompt).toContain('bình thường')
      expect(prompt).toContain('chăm sóc tại nhà')
    })

    it('should include follow-up questions in prompt', () => {
      const scenario = PATIENT_SCENARIOS.anxiety_panic
      const prompt = getConsultationStylePrompt(scenario)
      
      scenario.followUpQuestions.forEach(question => {
        expect(prompt).toContain(question)
      })
    })

    it('should include recommended tools in prompt', () => {
      const scenario = PATIENT_SCENARIOS.acute_chest_pain
      const prompt = getConsultationStylePrompt(scenario)
      
      scenario.recommendedTools.forEach(tool => {
        expect(prompt).toContain(tool)
      })
    })

    it('should handle null scenario gracefully', () => {
      const prompt = getConsultationStylePrompt(null)
      expect(prompt).toBeDefined()
      expect(typeof prompt).toBe('string')
    })
  })

  describe('Risk Level Assessment', () => {
    it('should correctly classify CRITICAL risk scenarios', () => {
      const criticalScenarios = Object.values(PATIENT_SCENARIOS).filter(s => s.riskLevel === 'critical')
      expect(criticalScenarios.length).toBeGreaterThan(0)
      expect(criticalScenarios.some(s => s.id === 'acute_chest_pain')).toBe(true)
      expect(criticalScenarios.some(s => s.id === 'depression_severe')).toBe(true)
    })

    it('should correctly classify HIGH risk scenarios', () => {
      const highRiskScenarios = Object.values(PATIENT_SCENARIOS).filter(s => s.riskLevel === 'high')
      expect(highRiskScenarios.some(s => s.id === 'diabetes_management')).toBe(true)
      expect(highRiskScenarios.some(s => s.id === 'hypertension')).toBe(true)
    })

    it('should correctly classify MEDIUM risk scenarios', () => {
      const mediumRiskScenarios = Object.values(PATIENT_SCENARIOS).filter(s => s.riskLevel === 'medium')
      expect(mediumRiskScenarios.some(s => s.id === 'anxiety_panic')).toBe(true)
      expect(mediumRiskScenarios.some(s => s.id === 'burnout_stress')).toBe(true)
    })

    it('should correctly classify LOW risk scenarios', () => {
      const lowRiskScenarios = Object.values(PATIENT_SCENARIOS).filter(s => s.riskLevel === 'low')
      expect(lowRiskScenarios.some(s => s.id === 'cold_flu')).toBe(true)
      expect(lowRiskScenarios.some(s => s.id === 'weight_management')).toBe(true)
    })
  })

  describe('Recommended Tools', () => {
    it('should include emergency tools for critical scenarios', () => {
      const acuteChestPain = PATIENT_SCENARIOS.acute_chest_pain
      expect(acuteChestPain.recommendedTools).toContain('tra-cuu')
      expect(acuteChestPain.recommendedTools).toContain('bac-si')
    })

    it('should include screening tools for psychological scenarios', () => {
      const anxiety = PATIENT_SCENARIOS.anxiety_panic
      expect(anxiety.recommendedTools).toContain('sang-loc')
      expect(anxiety.recommendedTools).toContain('tri-lieu')
    })

    it('should include therapy tools for mental health', () => {
      const burnout = PATIENT_SCENARIOS.burnout_stress
      expect(burnout.recommendedTools).toContain('tam-su')
    })

    it('should include medical lookup for all scenarios', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.recommendedTools.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Follow-up Questions', () => {
    it('should have follow-up questions for each scenario', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.followUpQuestions.length).toBeGreaterThan(0)
        scenario.followUpQuestions.forEach(q => {
          expect(typeof q).toBe('string')
          expect(q.length).toBeGreaterThan(0)
        })
      })
    })

    it('should include emergency warning for critical scenarios', () => {
      const acutePain = PATIENT_SCENARIOS.acute_chest_pain
      const hasWarning = acutePain.followUpQuestions.some(q => q.includes('⚠️') || q.includes('115'))
      expect(hasWarning).toBe(true)
    })

    it('should include risk assessment questions for psychological scenarios', () => {
      const depression = PATIENT_SCENARIOS.depression_severe
      const hasRiskQuestions = depression.followUpQuestions.some(q => 
        q.includes('tự tử') || q.includes('ý tưởng')
      )
      expect(hasRiskQuestions).toBe(true)
    })
  })

  describe('Real-world Conversation Scenarios', () => {
    it('Scenario 1: Chest pain patient', () => {
      const messages = [
        'Tôi bị đau ngực từ sáng',
        'Đau bên trái, rất khó chịu',
        'Tôi có tim đập nhanh'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe('acute_chest_pain')
        expect(scenario?.riskLevel).toBe('critical')
      })
    })

    it('Scenario 2: Anxiety patient gradually revealing severity', () => {
      const messages = [
        'Tôi cảm thấy lo âu',
        'Lo âu từ 2 tuần nay, mất ngủ',
        'Tim tôi đập rất nhanh, khó thở'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe('anxiety_panic')
        expect(scenario?.riskLevel).toBe('medium')
      })
    })

    it('Scenario 3: Chronic disease management', () => {
      const messages = [
        'Tôi bị tiểu đường',
        'Đường huyết dao động từ 150-250',
        'Tôi muốn quản lý tốt hơn'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe('diabetes_management')
        expect(scenario?.riskLevel).toBe('high')
      })
    })

    it('Scenario 4: Mental health crisis', () => {
      const messages = [
        'Tôi cảm thấy tuyệt vọng',
        'Tôi không thấy hy vọng',
        'Tôi đã có kế hoạch tự tử'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe('depression_severe')
        expect(scenario?.riskLevel).toBe('critical')
      })
    })

    it('Scenario 5: Work stress and burnout', () => {
      const messages = [
        'Tôi stress công việc',
        'Tôi mệt mỏi, kiệt sức',
        'Tôi mất ngủ mỗi đêm'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(['burnout_stress', 'insomnia']).toContain(scenario?.id)
      })
    })
  })

  describe('Performance & Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'Đau ngực ' + 'a'.repeat(1000)
      const scenario = detectPatientScenario(longMessage)
      expect(scenario?.id).toBe('acute_chest_pain')
    })

    it('should handle Vietnamese diacritical marks', () => {
      const messages = [
        'Tôi bị đau ngực',
        'Tôi bị đau ngực',
        'Tôi bị đau ngực'
      ]
      
      messages.forEach(msg => {
        const scenario = detectPatientScenario(msg)
        expect(scenario?.id).toBe('acute_chest_pain')
      })
    })

    it('should handle mixed languages gracefully', () => {
      const scenario = detectPatientScenario('Tôi có chest pain')
      expect(scenario).toBeDefined()
    })

    it('should handle empty or whitespace-only input', () => {
      expect(detectPatientScenario('')).toBeNull()
      expect(detectPatientScenario('   ')).toBeNull()
    })

    it('should handle special characters', () => {
      const scenario = detectPatientScenario('Tôi đau ngực!!! Tim đập rất nhanh???')
      expect(scenario?.id).toBe('acute_chest_pain')
    })
  })

  describe('Consultation Quality Checks', () => {
    it('all scenarios should have descriptive names', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.name.length).toBeGreaterThan(3)
      })
    })

    it('all scenarios should have at least 3 keywords', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.keywords.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('all scenarios should have examples', () => {
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(scenario.examples.length).toBeGreaterThan(0)
      })
    })

    it('all scenarios should have valid consultation styles', () => {
      const validStyles = ['urgent', 'preventive', 'psychological', 'general', 'chronic']
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(validStyles).toContain(scenario.consultationStyle)
      })
    })

    it('all scenarios should have valid risk levels', () => {
      const validRisks = ['low', 'medium', 'high', 'critical']
      Object.values(PATIENT_SCENARIOS).forEach(scenario => {
        expect(validRisks).toContain(scenario.riskLevel)
      })
    })
  })
})
