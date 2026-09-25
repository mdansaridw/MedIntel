import type {
  BiomarkerReading,
  ClinicalCategory,
  Patient,
  TherapyOption,
  TreatmentProfile,
} from '../types/clinical'
import { getPrimaryCondition, mockPatients } from './mockPatients'

const therapyNames: Record<ClinicalCategory, [string, string, string]> = {
  Cardiovascular: ['ACE inhibitor therapy', 'Beta blocker therapy', 'Care pathway optimization'],
  Metabolic: ['Glucose management program', 'Metformin-based program', 'Lifestyle intervention'],
  Respiratory: ['Inhaler optimization', 'Pulmonary rehabilitation', 'Respiratory monitoring program'],
  Neurological: ['Preventive therapy', 'Neurology observation program', 'Trigger management program'],
  Musculoskeletal: ['Physical therapy', 'Pain management program', 'Mobility optimization'],
  Renal: ['Renal monitoring program', 'Cardiorenal protection program', 'Nutrition optimization'],
  Endocrine: ['Hormone management program', 'Metabolic monitoring program', 'Nutrition optimization'],
  'Mental Health': ['Behavioral health program', 'Medication optimization', 'Recovery support program'],
  Gastrointestinal: ['Digestive health program', 'Dietary optimization', 'Symptom monitoring program'],
  Hematologic: ['Nutrient replenishment program', 'Iron status monitoring', 'Dietary optimization'],
  Dermatologic: ['Skin barrier care program', 'Topical therapy', 'Trigger avoidance program'],
  Other: ['Personalized care program', 'Monitoring and optimization', 'Lifestyle intervention'],
}

const proceduresByCategory: Record<ClinicalCategory, string[]> = {
  Cardiovascular: ['Diagnostic imaging review', 'Cardiac stress evaluation', 'Blood pressure monitoring'],
  Metabolic: ['Glucose profile review', 'Nutrition assessment', 'Metabolic screening'],
  Respiratory: ['Pulmonary function testing', 'Sleep assessment', 'Respiratory review'],
  Neurological: ['Neurological examination', 'Imaging review', 'Symptom diary review'],
  Musculoskeletal: ['Mobility assessment', 'Physical therapy review', 'Joint function evaluation'],
  Renal: ['Renal function panel', 'Ultrasound review', 'Nutrition assessment'],
  Endocrine: ['Thyroid panel review', 'Hormone profile review', 'Metabolic screening'],
  'Mental Health': ['Screening review', 'Wellbeing assessment', 'Care-plan follow-up'],
  Gastrointestinal: ['Endoscopic review', 'Liver function panel', 'Dietary assessment'],
  Hematologic: ['Complete blood count', 'Iron studies', 'Nutritional assessment'],
  Dermatologic: ['Skin assessment', 'Allergy review', 'Treatment response review'],
  Other: ['Diagnostic review', 'Monitoring review', 'Personalized care review'],
}

function getBiomarker(category: ClinicalCategory, index: number): BiomarkerReading {
  const offset = index % 9

  switch (category) {
    case 'Cardiovascular':
      return {
        name: 'Systolic blood pressure',
        value: `${128 + offset * 2}`,
        unit: 'mmHg',
        target: '< 130 mmHg',
        status: offset > 4 ? 'Above target' : 'In range',
      }
    case 'Metabolic':
      return {
        name: 'HbA1c',
        value: `${(5.8 + offset * 0.2).toFixed(1)}`,
        unit: '%',
        target: '< 7.0%',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    case 'Respiratory':
      return {
        name: 'FEV1 ratio',
        value: `${(82 - offset).toFixed(0)}`,
        unit: '% predicted',
        target: '> 80%',
        status: offset > 3 ? 'Below target' : 'In range',
      }
    case 'Neurological':
      return {
        name: 'Symptom frequency',
        value: `${3 + offset}`,
        unit: 'days / month',
        target: '< 4 days',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    case 'Musculoskeletal':
      return {
        name: 'Pain score',
        value: `${(2 + offset * 0.4).toFixed(1)}`,
        unit: '/ 10',
        target: '< 3.0',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    case 'Renal':
      return {
        name: 'eGFR',
        value: `${92 - offset * 3}`,
        unit: 'mL/min',
        target: '> 60',
        status: offset > 3 ? 'Below target' : 'In range',
      }
    case 'Endocrine':
      return {
        name: 'TSH',
        value: `${(1.4 + offset * 0.3).toFixed(1)}`,
        unit: 'mIU/L',
        target: '0.4–4.0',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    case 'Mental Health':
      return {
        name: 'Wellbeing score',
        value: `${74 - offset * 2}`,
        unit: '/ 100',
        target: '> 70',
        status: offset > 3 ? 'Below target' : 'In range',
      }
    case 'Gastrointestinal':
      return {
        name: 'Symptom burden',
        value: `${(2 + offset * 0.35).toFixed(1)}`,
        unit: '/ 10',
        target: '< 3.0',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    case 'Hematologic':
      return {
        name: 'Hemoglobin',
        value: `${13.6 - offset * 0.2}`,
        unit: 'g/dL',
        target: '> 12.0',
        status: offset > 4 ? 'Below target' : 'In range',
      }
    case 'Dermatologic':
      return {
        name: 'Symptom severity',
        value: `${(1.5 + offset * 0.3).toFixed(1)}`,
        unit: '/ 10',
        target: '< 3.0',
        status: offset > 3 ? 'Above target' : 'In range',
      }
    default:
      return {
        name: 'Composite health score',
        value: `${78 - offset}`,
        unit: '/ 100',
        target: '> 70',
        status: offset > 3 ? 'Below target' : 'In range',
      }
  }
}

function createTreatmentProfile(patient: Patient, index: number): TreatmentProfile {
  const condition = getPrimaryCondition(patient)
  const controlScore = 58 + ((index * 7) % 39)
  const therapies: TherapyOption[] = therapyNames[condition.category].map((name, therapyIndex) => ({
    name,
    line: `${therapyIndex + 1}${therapyIndex === 0 ? 'st' : therapyIndex === 1 ? 'nd' : 'rd'} line`,
    efficacy: Math.min(94, 70 + ((index * 5 + therapyIndex * 7) % 22)),
    recoveryRate: Math.min(92, 62 + ((index * 6 + therapyIndex * 9) % 28)),
    cohortSize: 18 + ((index * 3 + therapyIndex * 11) % 64),
  }))

  return {
    patientId: patient.id,
    controlScore,
    controlLabel:
      controlScore >= 82 ? 'Well controlled' : controlScore >= 70 ? 'Monitor closely' : 'Needs review',
    biomarker: getBiomarker(condition.category, index),
    therapies,
    procedures: proceduresByCategory[condition.category],
    recommendation:
      controlScore >= 82
        ? 'Continue the current plan and maintain routine monitoring.'
        : controlScore >= 70
          ? 'Review adherence and reassess the primary biomarker at the next visit.'
          : 'Prioritize a clinician-led treatment review and repeat baseline measurements.',
    nextReview: new Date(Date.UTC(2026, 9, 8 + (index % 20))).toISOString(),
  }
}

export const mockTreatmentProfiles = mockPatients.map(createTreatmentProfile)

export function getTreatmentProfile(patientId: string) {
  return mockTreatmentProfiles.find((profile) => profile.patientId === patientId)
}
