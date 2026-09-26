export type PatientSex = 'Male' | 'Female' | 'Other'
export type PatientStatus = 'Stable' | 'Monitoring' | 'Critical'
export type ClinicalTrend = 'Increasing' | 'Stable' | 'Decreasing'

export type ClinicalCategory =
  | 'Cardiovascular'
  | 'Metabolic'
  | 'Respiratory'
  | 'Neurological'
  | 'Musculoskeletal'
  | 'Renal'
  | 'Endocrine'
  | 'Mental Health'
  | 'Gastrointestinal'
  | 'Hematologic'
  | 'Dermatologic'
  | 'Other'

export interface Patient {
  id: string
  name: string
  mobile: string
  address: string
  age: number
  sex: PatientSex
  conditionIds: string[]
  lastConsultation: string
  status: PatientStatus
}

export interface DiseaseCohort {
  id: string
  name: string
  description: string
  category: ClinicalCategory
  baselineTrend: ClinicalTrend
}

export interface CohortSummary extends DiseaseCohort {
  patientIds: string[]
  affectedPatients: number
  prevalence: number
  trend: ClinicalTrend
}

export interface DashboardMetric {
  label: string
  value: string
  detail: string
  /**
   * Optional trend/secondary-stat chip. The clinical graph is a static snapshot with no
   * time dimension, so a directional delta cannot be derived honestly; supply a real
   * secondary statistic instead, or omit the chip entirely.
   */
  change?: string
  direction?: 'up' | 'down' | 'neutral'
}

export interface BiomarkerReading {
  name: string
  value: string
  unit: string
  target: string
  status: 'In range' | 'Above target' | 'Below target'
}

export interface TherapyOption {
  name: string
  line: string
  efficacy: number
  recoveryRate: number
  cohortSize: number
}

export interface TreatmentProfile {
  patientId: string
  controlScore: number
  controlLabel: 'Well controlled' | 'Monitor closely' | 'Needs review'
  biomarker: BiomarkerReading
  therapies: TherapyOption[]
  procedures: string[]
  recommendation: string
  nextReview: string
}
