const API_BASE_URL = 'http://localhost:5000/api'

/**
 * Helper for making API calls with error handling.
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Fetch failed for ${endpoint}:`, error)
    throw error
  }
}

export const MedIntelApi = {
  // --- PATIENTS ---
  getPatients: async (limit: number = 50) => {
    return fetchApi<any[]>(`/patients?limit=${limit}`)
  },

  getPatientProfile: async (patientId: string) => {
    return fetchApi<any>(`/patients/${patientId}`)
  },

  getPatientSummary: async (patientId: string) => {
    return fetchApi<{ patient_id: string; summary: string; model: string; status: string }>(`/patients/${patientId}/summary`)
  },

  decryptPatientPii: async (patientId: string, authReason: string = 'Emergency Break-Glass Clinical Review') => {
    return fetchApi<any>(`/vault/decrypt-patient`, {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, auth_reason: authReason })
    })
  },

  // --- KNOWLEDGE GRAPH ---
  getPatientSubgraph: async (patientId: string) => {
    return fetchApi<{ nodes: any[]; edges: any[] }>(`/graph/subgraph/${patientId}`)
  },

  // --- PATIENT SIMILARITY (METHOD 4) & COHORTS ---
  getSimilarPatients: async (patientId: string, topK: number = 5) => {
    return fetchApi<any[]>(`/cohort/similar?patient_id=${patientId}&top_k=${topK}`)
  },

  getCohorts: async () => {
    return fetchApi<any[]>('/cohorts')
  },

  // --- TREATMENT INTELLIGENCE ---
  getGlobalTreatment: async (conditionCode: string) => {
    return fetchApi<any[]>(`/treatment/global?condition_code=${conditionCode}`)
  },
  
  getCohortTreatment: async (primaryCondition: string, comorbidities: string[] = [], minAge: number = 0, maxAge: number = 120) => {
    const queryParams = new URLSearchParams({
      primary_condition: primaryCondition,
      min_age: minAge.toString(),
      max_age: maxAge.toString()
    })
    comorbidities.forEach(c => queryParams.append('comorbidities', c))
    return fetchApi<any[]>(`/treatment/cohort?${queryParams.toString()}`)
  },

  getPersonalizedTreatment: async (patientId: string) => {
    return fetchApi<any>(`/treatment/personalized?patient_id=${patientId}`)
  },

  // --- SUPPLY CHAIN ---
  checkSupply: async (rxnormCode: string) => {
    return fetchApi<any>(`/supply/check?rxnorm_code=${rxnormCode}`)
  },

  checkFdaRecall: async (lotNumber: string) => {
    return fetchApi<any>(`/supply/fda-recall?lot_number=${lotNumber}`)
  },

  // --- AMBIENT AI SCRIBE & PHYSICIAN REVIEW ---
  getScribePresets: async () => {
    return fetchApi<any[]>('/scribe/presets')
  },

  transcribeAndExtractEncounter: async (data: FormData | { patient_id: string; dialogue_text?: string; physician_name?: string }) => {
    if (data instanceof FormData) {
      const res = await fetch(`${API_BASE_URL}/scribe/transcribe-and-extract`, {
        method: 'POST',
        body: data
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Extraction failed' }))
        throw new Error(err.error || 'Failed to process consultation audio')
      }
      return await res.json()
    } else {
      const res = await fetch(`${API_BASE_URL}/scribe/transcribe-and-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Extraction failed' }))
        throw new Error(err.error || 'Failed to process consultation text')
      }
      return await res.json()
    }
  },

  commitScribeEncounter: async (payload: {
    patient_id: string
    physician_name: string
    physician_license: string
    approved_soap: Record<string, string>
    approved_conditions: any[]
    approved_medications: any[]
    approved_vitals?: Record<string, any>
    override_allergy_warning?: boolean
  }) => {
    const res = await fetch(`${API_BASE_URL}/scribe/commit-encounter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Encounter commit rejected by safety rules')
    }
    return data
  }
}
