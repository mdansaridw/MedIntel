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
  }
}
