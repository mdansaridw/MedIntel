import { describe, it, expect } from 'vitest'
import {
  anonymizePrompt,
  rehydrateText,
  classifyIntent
} from './clientAnonymizer'

describe('Client-Side Anonymization & Intent Guardrails', () => {
  const mockPatients = [
    { id: '6095681c-dfc1-8f20-411c-42cef37189fa', name: 'Ali Krajcik', gender: 'M', birth_year: 2000 },
    { id: '11223344-5566-7788-9900-aabbccddeeff', name: 'John Doe', gender: 'M', birth_year: 1980 }
  ]

  describe('classifyIntent', () => {
    it('correctly classifies conversational greetings', () => {
      expect(classifyIntent('hii')).toBe('greeting')
      expect(classifyIntent('hello')).toBe('greeting')
      expect(classifyIntent('hey there')).toBe('greeting')
      expect(classifyIntent('good morning')).toBe('greeting')
      expect(classifyIntent('how are you')).toBe('greeting')
      expect(classifyIntent('who are you')).toBe('greeting')
    })

    it('correctly classifies non-clinical and out-of-domain queries', () => {
      expect(classifyIntent('what is the weather today?')).toBe('non_clinical')
      expect(classifyIntent('tell me a funny joke')).toBe('non_clinical')
      expect(classifyIntent('who won the football game?')).toBe('non_clinical')
      expect(classifyIntent('give me a chocolate cake recipe')).toBe('non_clinical')
      expect(classifyIntent('write python code to sort a list')).toBe('non_clinical')
    })

    it('correctly classifies legitimate clinical queries', () => {
      expect(classifyIntent('what is his bmi')).toBe('clinical')
      expect(classifyIntent('Summarize Ali Krajcik medical history')).toBe('clinical')
      expect(classifyIntent('What medications are prescribed for diabetes?')).toBe('clinical')
      expect(classifyIntent('Does the patient have abnormal lab test results?')).toBe('clinical')
      expect(classifyIntent('Are any critical medications below reorder threshold?')).toBe('clinical')
      expect(classifyIntent('Check for SALAD risk in recent consultations')).toBe('clinical')
    })
  })

  describe('anonymizePrompt & rehydrateText', () => {
    it('de-identifies patient names into synthetic tokens', () => {
      const raw = 'What is Ali Krajcik\'s bmi and blood pressure?'
      const { anonymizedText, tokenMap, isAnonymized, redactedTypes } = anonymizePrompt(raw, mockPatients)

      expect(isAnonymized).toBe(true)
      expect(redactedTypes).toContain('PATIENT_NAME')
      expect(anonymizedText).toContain('[PATIENT:6095681c]')
      expect(anonymizedText).not.toContain('Ali Krajcik')
      expect(tokenMap['[PATIENT:6095681c]']).toBe('Ali Krajcik')

      // Test rehydration
      const rehydrated = rehydrateText(anonymizedText, tokenMap)
      expect(rehydrated).toBe(raw)
    })

    it('scrubs sensitive PII patterns (SSN, Email, Phone)', () => {
      const rawWithPii = 'Patient SSN is 123-45-6789, email test@hospital.org and phone (555) 123-4567.'
      const { anonymizedText, isAnonymized, redactedTypes } = anonymizePrompt(rawWithPii, mockPatients)

      expect(isAnonymized).toBe(true)
      expect(redactedTypes).toContain('SSN')
      expect(redactedTypes).toContain('EMAIL')
      expect(redactedTypes).toContain('PHONE')

      expect(anonymizedText).toContain('[REDACTED_SSN]')
      expect(anonymizedText).toContain('[REDACTED_EMAIL]')
      expect(anonymizedText).toContain('[REDACTED_PHONE]')

      expect(anonymizedText).not.toContain('123-45-6789')
      expect(anonymizedText).not.toContain('test@hospital.org')
      expect(anonymizedText).not.toContain('(555) 123-4567')
    })

    it('leaves anonymous population queries untouched', () => {
      const popQuery = 'What are the most common diagnoses across all patients?'
      const { anonymizedText, isAnonymized, redactedTypes } = anonymizePrompt(popQuery, mockPatients)

      expect(isAnonymized).toBe(false)
      expect(redactedTypes.length).toBe(0)
      expect(anonymizedText).toBe(popQuery)
    })
  })
})
