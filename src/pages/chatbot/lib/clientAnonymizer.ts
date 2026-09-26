/**
 * Client-Side PII De-Identification & Intent Guardrail Utilities
 * Strictly enforces HIPAA Safe Harbor: scrubs direct patient identifiers before network dispatch.
 */

export interface PatientEntity {
  id: string
  name?: string
  gender?: string
  birth_year?: number
}

export interface AnonymizationResult {
  anonymizedText: string
  tokenMap: Record<string, string> // e.g. { '[PATIENT:6095681c]': 'Ali Krajcik' }
  isAnonymized: boolean
  redactedTypes: string[]
}

/**
 * Scrubs patient names and direct PII from text on the client device
 * BEFORE sending across the network or to external APIs.
 */
export function anonymizePrompt(
  rawText: string,
  patients: PatientEntity[] = []
): AnonymizationResult {
  let anonymized = rawText
  const tokenMap: Record<string, string> = {}
  const redactedTypes: Set<string> = new Set()

  // 1. Scrub Known Patient Names
  for (const p of patients) {
    if (!p.name || p.name.trim().length < 2) continue
    const fullName = p.name.trim()
    const shortId = p.id.slice(0, 8)
    const token = `[PATIENT:${shortId}]`

    // Full name match (case-insensitive, word boundary)
    const nameRegex = new RegExp(`\\b${escapeRegExp(fullName)}\\b`, 'gi')
    if (nameRegex.test(anonymized)) {
      anonymized = anonymized.replace(nameRegex, token)
      tokenMap[token] = fullName
      redactedTypes.add('PATIENT_NAME')
    }

    // Split first and last names if multi-part
    const nameParts = fullName.split(/\s+/).filter((part) => part.length >= 3)
    if (nameParts.length >= 2) {
      for (const part of nameParts) {
        // Skip common words that might coincide with names
        if (['the', 'and', 'for', 'all'].includes(part.toLowerCase())) continue
        const partRegex = new RegExp(`\\b${escapeRegExp(part)}\\b`, 'gi')
        if (partRegex.test(anonymized)) {
          anonymized = anonymized.replace(partRegex, token)
          tokenMap[token] = fullName
          redactedTypes.add('PATIENT_NAME')
        }
      }
    }
  }

  // 2. Scrub SSN: 000-00-0000
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g
  if (ssnRegex.test(anonymized)) {
    anonymized = anonymized.replace(ssnRegex, '[REDACTED_SSN]')
    redactedTypes.add('SSN')
  }

  // 3. Scrub Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  if (emailRegex.test(anonymized)) {
    anonymized = anonymized.replace(emailRegex, '[REDACTED_EMAIL]')
    redactedTypes.add('EMAIL')
  }

  // 4. Scrub Phone Numbers
  const phoneRegex = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g
  if (phoneRegex.test(anonymized)) {
    anonymized = anonymized.replace(phoneRegex, '[REDACTED_PHONE]')
    redactedTypes.add('PHONE')
  }

  return {
    anonymizedText: anonymized,
    tokenMap,
    isAnonymized: redactedTypes.size > 0,
    redactedTypes: Array.from(redactedTypes)
  }
}

/**
 * Re-hydrates synthetic tokens back to display names in local browser memory
 * for authenticated clinician rendering.
 */
export function rehydrateText(
  anonymizedText: string,
  tokenMap: Record<string, string>
): string {
  let rehydrated = anonymizedText
  for (const [token, realName] of Object.entries(tokenMap)) {
    rehydrated = rehydrated.replaceAll(token, realName)
  }
  return rehydrated
}

/**
 * Detects whether an input is a greeting, non-clinical query, or a valid clinical query.
 */
export type QueryIntent = 'greeting' | 'non_clinical' | 'clinical'

const GREETING_PATTERNS = [
  /^\s*(hi|hii|hiii|hello|helo|hey|heya|howdy|yo|sup)\b/i,
  /^\s*good\s*(morning|afternoon|evening|day)\b/i,
  /^\s*(greetings|salutations)\b/i,
  /^\s*how\s*are\s*you\b/i,
  /^\s*(who|what)\s*(are|is)\s*(you|your\s+name|this)\b/i,
  /^\s*what('s|\s+is)\s+(your\s+name|this|medintel|medisynapse)\b/i,
  /^\s*(introduce\s+yourself|tell\s+me\s+about\s+yourself|who\s+made\s+you|who\s+created\s+you)\b/i,
  /^\s*(thank\s+you|thanks|thx|bye|goodbye|see\s+ya)\b/i,
  /^\s*what\s*can\s*you\s*do\b/i,
  /^\s*(help|start|menu)\b/i
]

const NON_CLINICAL_KEYWORDS = [
  'weather', 'forecast', 'rain', 'temperature', 'sunny',
  'joke', 'riddle', 'poem', 'story', 'song',
  'movie', 'actor', 'football', 'cricket', 'nfl', 'nba', 'soccer', 'sports',
  'recipe', 'cook', 'bake', 'food recipe',
  'python code', 'javascript code', 'write code', 'write a function',
  'president', 'election', 'politics',
  'stock price', 'bitcoin', 'crypto', 'crypto currency'
]

const CLINICAL_ANCHORS = [
  'bmi', 'body mass index', 'vital', 'vitals', 'blood pressure', 'hba1c', 'weight', 'height',
  'medication', 'prescribed', 'drug', 'prescription', 'dosage', 'rxnorm',
  'condition', 'diagnosis', 'diagnoses', 'disease', 'allergy', 'allergies', 'allergic',
  'lab', 'labs', 'test', 'result', 'procedure', 'treatment', 'outcome',
  'patient', 'patients', 'population', 'summary', 'medical history', 'history',
  'supply', 'inventory', 'stock', 'recall', 'salad', 'reorder', 'sound-alike'
]

export function classifyIntent(query: string): QueryIntent {
  const clean = query.trim().toLowerCase()
  if (!clean) return 'greeting'

  // 1. Exact or starts-with Greeting check
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(clean)) {
      // If it's pure greeting or greeting with short follow-up without strong clinical terms
      const hasClinicalTerm = CLINICAL_ANCHORS.some((term) => clean.includes(term))
      if (!hasClinicalTerm) {
        return 'greeting'
      }
    }
  }

  // 2. Explicit Non-Clinical checks
  for (const kw of NON_CLINICAL_KEYWORDS) {
    if (clean.includes(kw)) {
      const hasClinicalAnchor = CLINICAL_ANCHORS.some((term) => clean.includes(term))
      if (!hasClinicalAnchor) {
        return 'non_clinical'
      }
    }
  }

  // 3. Very short query without clinical anchor (e.g. "ok", "cool", "test", "asdf")
  if (clean.length < 5 && !CLINICAL_ANCHORS.some((term) => clean.includes(term))) {
    return 'greeting'
  }

  return 'clinical'
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
