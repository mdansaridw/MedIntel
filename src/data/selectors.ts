import type { CohortSummary } from '../types/clinical'
import { mockCohorts } from './mockCohorts'
import { mockPatients } from './mockPatients'

export function getCohortSummaries(): CohortSummary[] {
  return mockCohorts.map((cohort) => {
    const patientIds = mockPatients
      .filter((patient) => patient.conditionIds.includes(cohort.id))
      .map((patient) => patient.id)

    return {
      ...cohort,
      patientIds,
      affectedPatients: patientIds.length,
      prevalence: (patientIds.length / mockPatients.length) * 100,
      trend: cohort.baselineTrend,
    }
  })
}

export function getCohortSummary(cohortId: string) {
  return getCohortSummaries().find((cohort) => cohort.id === cohortId)
}
