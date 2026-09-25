import { describe, expect, it } from 'vitest'
import { mockCohorts } from './mockCohorts'
import { mockPatients } from './mockPatients'
import { getCohortSummaries } from './selectors'

describe('mock clinical data', () => {
  it('contains the required patient and cohort counts', () => {
    expect(mockPatients).toHaveLength(30)
    expect(mockCohorts).toHaveLength(40)
  })

  it('uses unique patient and cohort identifiers', () => {
    expect(new Set(mockPatients.map((patient) => patient.id)).size).toBe(30)
    expect(new Set(mockCohorts.map((cohort) => cohort.id)).size).toBe(40)
  })

  it('only references known conditions', () => {
    const conditionIds = new Set(mockCohorts.map((cohort) => cohort.id))
    const referencesKnownCondition = mockPatients.every((patient) =>
      patient.conditionIds.every((conditionId) => conditionIds.has(conditionId)),
    )

    expect(referencesKnownCondition).toBe(true)
  })

  it('includes every cohort in at least one patient profile', () => {
    const summaries = getCohortSummaries()
    expect(summaries).toHaveLength(40)
    expect(summaries.every((summary) => summary.affectedPatients > 0)).toBe(true)
  })
})
