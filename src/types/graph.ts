export interface ClinicalGraphNode {
  id: string
  label: string
  group: 'patient' | 'disease' | 'medication' | 'lab' | 'consultation' | 'doctor'
  title?: string
}

export interface ClinicalGraphEdge {
  id: string
  from: string
  to: string
  label?: string
  relationship: string
}
