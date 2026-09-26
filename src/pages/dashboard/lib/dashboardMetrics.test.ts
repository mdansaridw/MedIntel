import { describe, expect, it } from 'vitest'
import {
  buildCohortRadar,
  computeDashboardMetrics,
  isBmiInTarget,
  isBpInTarget,
  THRESHOLDS,
} from './dashboardMetrics'
import type { CohortRecord, GraphCounts, PatientRecord } from '../types'

let seq = 0
function patient(overrides: Partial<PatientRecord> = {}): PatientRecord {
  seq += 1
  return {
    id: `p-${seq}`,
    name: `Patient p-${seq}`,
    birth_year: 1990,
    gender: 'F',
    race: 'white',
    bmi: 22,
    systolic_bp: 120,
    diastolic_bp: 80,
    hba1c: 5.4,
    condition_count: 2,
    medication_count: 1,
    conditions: [],
    ...overrides,
  }
}

// A realistic graph-scale fixture, not a snapshot. The shared Neo4j instance is written
// to by processes outside this repo, so pinning live totals here would just rot.
const counts: GraphCounts = {
  patients: 108,
  conditions: 188,
  medications: 147,
  allergies: 19,
  pharmacy_items: 166,
  supply_items: 20,
  total_nodes: 648,
  total_edges: 3519,
}

const cohorts: CohortRecord[] = [
  { code: '66383009', name: 'Gingivitis (disorder)', category: null, patient_count: 84, prevalence_pct: 77.8 },
  { code: '73595000', name: 'Stress (finding)', category: null, patient_count: 82, prevalence_pct: 75.9 },
]

describe('care-gap predicates', () => {
  it('treats the BMI band as inclusive at both bounds', () => {
    expect(isBmiInTarget(patient({ bmi: THRESHOLDS.bmiLower }))).toBe(true)
    expect(isBmiInTarget(patient({ bmi: THRESHOLDS.bmiUpper }))).toBe(true)
    expect(isBmiInTarget(patient({ bmi: THRESHOLDS.bmiUpper + 0.1 }))).toBe(false)
    expect(isBmiInTarget(patient({ bmi: THRESHOLDS.bmiLower - 0.1 }))).toBe(false)
  })

  it('excludes a null BMI from the in-target set', () => {
    expect(isBmiInTarget(patient({ bmi: null }))).toBe(false)
  })

  it('requires BOTH systolic and diastolic to be under target', () => {
    expect(isBpInTarget(patient({ systolic_bp: 129, diastolic_bp: 79 }))).toBe(true)
    expect(isBpInTarget(patient({ systolic_bp: 130, diastolic_bp: 79 }))).toBe(false)
    expect(isBpInTarget(patient({ systolic_bp: 120, diastolic_bp: 80 }))).toBe(false)
  })

  it('excludes incomplete vitals from the BP in-target set', () => {
    expect(isBpInTarget(patient({ diastolic_bp: null }))).toBe(false)
  })
})

describe('computeDashboardMetrics', () => {
  const patients = [
    patient({ bmi: 22, systolic_bp: 120, diastolic_bp: 75 }), // both in target
    patient({ bmi: 31, systolic_bp: 150, diastolic_bp: 95 }), // neither
    patient({ bmi: 24.9, systolic_bp: 128, diastolic_bp: 79 }), // both in target
    patient({ bmi: 28, systolic_bp: 132, diastolic_bp: 82 }), // neither
  ]

  it('produces four metrics with live values', () => {
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    expect(metrics).toHaveLength(4)
    expect(metrics.map((m) => m.label)).toEqual([
      'Patients in Graph',
      'Disease Cohorts',
      'BMI In Target',
      'BP At Target',
    ])
  })

  it('reports care gaps as real percentages of the population', () => {
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    expect(metrics[2].value).toBe('50%')
    expect(metrics[3].value).toBe('50%')
  })

  it('counts how many patients remain to goal', () => {
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    expect(metrics[2].detail).toContain('2 patients to goal')
    expect(metrics[3].detail).toContain('2 patients to goal')
  })

  it('agrees in number with the patient on a single remaining care gap', () => {
    const metrics = computeDashboardMetrics([patients[0], patients[1]], cohorts, counts)
    expect(metrics[2].detail).toContain('1 patient to goal')
    expect(metrics[2].detail).not.toContain('1 patients')
  })

  it('prefers graph counters over the fetched page size for the patient total', () => {
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    expect(metrics[0].value).toBe('108')
    expect(metrics[0].change).toBe('3,519 edges')
  })

  it('never reports an edge count the graph cannot support', () => {
    // The counts endpoint previously returned a hardcoded 194,320 against a graph with
    // ~3,500 relationships — a ~55x overstatement. Any count above the real total is a
    // regression, so this pins the chip to the value the endpoint actually reports.
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    const reported = Number((metrics[0].change ?? '').replace(/\D/g, ''))
    expect(reported).toBe(counts.total_edges)
    expect(reported).toBeLessThanOrEqual(counts.total_nodes * 10)
  })

  it('falls back to the fetched length when telemetry is unavailable', () => {
    const metrics = computeDashboardMetrics(patients, cohorts)
    expect(metrics[0].value).toBe('4')
    expect(metrics[0].change).toBeUndefined()
  })

  it('separates disorder-class cohorts from social/lifestyle findings', () => {
    const metrics = computeDashboardMetrics(patients, cohorts, counts)
    expect(metrics[1].value).toBe('2')
    expect(metrics[1].change).toBe('1 disorder-class')
  })

  it('omits the care-gap cards when there are no patients', () => {
    const metrics = computeDashboardMetrics([], cohorts, counts)
    expect(metrics.map((m) => m.label)).toEqual(['Patients in Graph', 'Disease Cohorts'])
  })

  it('never emits NaN when vitals are missing', () => {
    const metrics = computeDashboardMetrics([patient({ bmi: null, systolic_bp: null, diastolic_bp: null })], cohorts, counts)
    expect(metrics[2].value).toBe('0%')
    expect(metrics[2].change).toBeUndefined()
    expect(metrics[3].change).toBeUndefined()
  })
})

/**
 * 14 patients laid out so the radar has something to say.
 *
 * Groups: diabetes = p1-p3 (hba1c 7+), hypertension = p4-p8 (p4-p7 by reading,
 * p8 by condition only), high care burden = p1-p2 (12 conditions).
 *
 *   cohort                        patients  pop%     diabetes  hypertension  burden
 *   Osteoarthritis (disorder)          8  57.1         33.3           60.0    50.0
 *   Anemia (disorder)                 7  50.0        100.0           80.0   100.0
 *   Metabolic syndrome X (disorder)   6  42.9         66.7            0.0   100.0
 *   Essential hypertension (disorder) 5  35.7          0.0          100.0     0.0
 *   Gingivitis (disorder)            14 100.0        100.0          100.0   100.0  <- flat
 *   Laceration - injury (disorder)    1   7.1         ...                        <- noise
 *   Social isolation (finding)        0  56.5         <- advertised, carried by nobody
 *   Full-time employment (finding)    0  77.8         <- advertised, carried by nobody
 *   Stress (finding)                  5  35.7         <- real, separates groups, not a diagnosis
 *
 * Six joinable disorders exist, which is what keeps the findings out of the chart.
 */
/** The 8 patients carrying "Osteoarthritis", chosen to be unevenly spread across the groups. */
const OSTEOARTHRITIS = new Set([0, 3, 5, 6, 8, 10, 11, 12])

const radarPatients: PatientRecord[] = [
  { diabetic: true,  htn: false, cc: 12, conds: ['Anemia (disorder)', 'Metabolic syndrome X (disorder)'] },
  { diabetic: true,  htn: false, cc: 12, conds: ['Anemia (disorder)', 'Metabolic syndrome X (disorder)'] },
  { diabetic: true,  htn: false, cc: 2,  conds: ['Anemia (disorder)'] },
  { diabetic: false, htn: true,  cc: 2,  conds: ['Anemia (disorder)', 'Essential hypertension (disorder)'] },
  { diabetic: false, htn: true,  cc: 2,  conds: ['Anemia (disorder)', 'Essential hypertension (disorder)'] },
  { diabetic: false, htn: true,  cc: 2,  conds: ['Anemia (disorder)', 'Essential hypertension (disorder)'] },
  { diabetic: false, htn: true,  cc: 2,  conds: ['Anemia (disorder)', 'Essential hypertension (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Essential hypertension (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Metabolic syndrome X (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Metabolic syndrome X (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Metabolic syndrome X (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Metabolic syndrome X (disorder)'] },
  { diabetic: false, htn: false, cc: 2,  conds: [] },
  { diabetic: false, htn: false, cc: 2,  conds: ['Laceration - injury (disorder)'] },
].map((row, index) =>
  patient({
    // p8 has no elevated reading; only the "Essential hypertension" diagnosis puts it in the group.
    systolic_bp: row.htn ? 150 : 120,
    hba1c: row.diabetic ? 7 : 5.4,
    condition_count: row.cc,
    conditions: [
      ...row.conds,
      'Gingivitis (disorder)',
      ...(index < 5 ? ['Stress (finding)'] : []),
      ...(OSTEOARTHRITIS.has(index) ? ['Osteoarthritis (disorder)'] : []),
    ],
  }),
)

const radarCohorts: CohortRecord[] = [
  { code: '38341003', name: 'Hypertensive disorder (finding)', category: null, patient_count: 84, prevalence_pct: 77.8 },
  { code: '306098002', name: 'Full-time employment (finding)', category: null, patient_count: 84, prevalence_pct: 77.8 },
  { code: '70232004', name: 'Stress (finding)', category: null, patient_count: 5, prevalence_pct: 41.7 },
  { code: '82423001', name: 'Chronic pain (finding)', category: null, patient_count: 14, prevalence_pct: 100 },
  { code: '86049000', name: 'Malignant neoplasm of breast (disorder)', category: null, patient_count: 7, prevalence_pct: 42.9 },
  { code: '0000-1', name: 'Anemia (disorder)', category: null, patient_count: 7, prevalence_pct: 50 },
  { code: '0000-2', name: 'Gingivitis (disorder)', category: null, patient_count: 14, prevalence_pct: 100 },
  { code: '0000-3', name: 'Laceration - injury (disorder)', category: null, patient_count: 9, prevalence_pct: 7.1 },
  { code: '0000-4', name: 'Essential hypertension (disorder)', category: null, patient_count: 5, prevalence_pct: 35.7 },
  { code: '0000-5', name: 'Metabolic syndrome X (disorder)', category: null, patient_count: 6, prevalence_pct: 42.9 },
  { code: '0000-6', name: 'Social isolation (finding)', category: null, patient_count: 61, prevalence_pct: 56.5 },
  { code: '0000-7', name: 'Chronic kidney disease (disorder)', category: null, patient_count: 8, prevalence_pct: 9.3 },
  { code: '0000-8', name: 'Osteoarthritis (disorder)', category: null, patient_count: 8, prevalence_pct: 57.1 },
]

const labels = (radar: ReturnType<typeof buildCohortRadar>) => radar.axes.map((a) => a.label)
const seriesOf = (radar: ReturnType<typeof buildCohortRadar>, key: string) =>
  radar.series.find((s) => s.key === key)!

describe('buildCohortRadar', () => {
  it('returns an empty radar with no patients or no cohorts', () => {
    expect(buildCohortRadar([], radarCohorts)).toEqual({ axes: [], series: [] })
    expect(buildCohortRadar(radarPatients, [])).toEqual({ axes: [], series: [] })
  })

  it('plots every non-empty patient group, with its true size', () => {
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(radar.series.map((s) => [s.key, s.size])).toEqual([
      ['population', 14],
      ['diabetes', 3],
      ['hypertension', 5],
      ['burden', 2],
    ])
  })

  it('drops cohorts the graph advertises but no patient actually carries', () => {
    // "Full-time employment" is advertised at 77.8% and "Social isolation" at 56.5%, yet
    // neither appears in any condition list. Plotting them would draw spokes that are
    // flat zero for every group — the exact dead chart this filter exists to prevent.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(labels(radar)).not.toContain('Full-time employment')
    expect(labels(radar)).not.toContain('Social isolation')
  })

  it('prefers diagnoses over social and lifestyle findings', () => {
    // "Stress (finding)" is genuinely carried by 5 patients and separates the groups by
    // 60pp, so it would qualify on merit alone. Enough disorders exist to fill the chart,
    // so it is never drawn — a radar of "who has stress" is not a disease distribution.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(labels(radar)).not.toContain('Stress')
    expect(labels(radar).every((l) => !l.includes('employment') && !l.includes('pain'))).toBe(true)
  })

  it('falls back to findings when too few disorders exist to fill the chart', () => {
    // Only "Anemia" survives as a disorder here, so the three findings join the candidate
    // pool rather than the chart being left half-empty.
    const thin = [
      { code: '0000-1', name: 'Anemia (disorder)', category: null, patient_count: 7, prevalence_pct: 50 },
      { code: '0000-3', name: 'Laceration - injury (disorder)', category: null, patient_count: 1, prevalence_pct: 7.1 },
      { code: 'f-1', name: 'First half (finding)', category: null, patient_count: 7, prevalence_pct: 50 },
      { code: 'f-2', name: 'Second half (finding)', category: null, patient_count: 7, prevalence_pct: 50 },
      { code: 'f-3', name: 'Odd numbered (finding)', category: null, patient_count: 7, prevalence_pct: 50 },
    ]
    const tagged = radarPatients.map((p, index) => ({
      ...p,
      conditions: [
        ...(p.conditions ?? []),
        ...(index < 7 ? ['First half (finding)'] : []),
        ...(index >= 7 ? ['Second half (finding)'] : []),
        ...(index % 2 === 0 ? ['Odd numbered (finding)'] : []),
      ],
    }))
    const radar = buildCohortRadar(tagged, thin)
    expect(labels(radar)).toContain('First half')
    expect(labels(radar)).toContain('Anemia')
    expect(radar.axes.length).toBeGreaterThanOrEqual(3)
  })

  it('drops a spoke no group separates', () => {
    // Everyone has gingivitis, so it is 100% everywhere: a flat line at the same radius
    // for every polygon carries no information.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(labels(radar)).not.toContain('Gingivitis')
  })

  it('drops a cohort too small for one patient not to swing the percentage', () => {
    // "Laceration - injury" is carried by 1 of 14. In a 2-patient group that is 50% versus
    // 0% for everyone else — a 50pp "finding" that is pure sampling noise.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(labels(radar)).not.toContain('Laceration - injury')
  })

  it('orders spokes by population prevalence, widest first', () => {
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    // The three strongest discriminators all sit at an identical 100pp spread, so the final
    // order comes entirely from the second sort.
    expect(labels(radar)).toEqual([
      'Osteoarthritis',
      'Anemia',
      'Metabolic syndrome X',
      'Essential hypertension',
    ])
    const prevalences = radar.axes.map((a) => a.prevalence)
    expect(prevalences).toEqual([...prevalences].sort((a, b) => b - a))
  })

  it('reports a cohort size that agrees with its own percentage', () => {
    // The graph's own patient_count disagrees with the patient list for the cohorts this
    // filter discards, so the axis header is computed from the same scan as the polygon.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    for (const axis of radar.axes) {
      expect(axis.patientCount).toBe(Math.round((axis.prevalence / 100) * radarPatients.length))
    }
    expect(radar.axes.find((a) => a.label === 'Anemia')).toMatchObject({
      patientCount: 7,
      prevalence: 50,
    })
  })

  it('divides by the size of the group being measured, not the whole population', () => {
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    const anemia = labels(radar).indexOf('Anemia')
    // Anemia: 3/3 diabetics, 4/5 hypertensives, 2/2 high-burden, 7/14 overall.
    expect(anemia).toBeGreaterThanOrEqual(0)
    expect(seriesOf(radar, 'population').values[anemia]).toBeCloseTo(50)
    expect(seriesOf(radar, 'diabetes').values[anemia]).toBe(100)
    expect(seriesOf(radar, 'hypertension').values[anemia]).toBeCloseTo(80)
    expect(seriesOf(radar, 'burden').values[anemia]).toBe(100)
  })

  it('assigns a patient to a group from their readings, not only their diagnoses', () => {
    // p7 has no diagnosis of hypertension and an elevated reading; p8 has the diagnosis
    // and a normal reading. Both belong to the group, so it holds 5 patients.
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    expect(seriesOf(radar, 'hypertension').size).toBe(5)
    expect(seriesOf(radar, 'hypertension').values[labels(radar).indexOf('Essential hypertension')]).toBe(100)
  })

  it('aligns every series to the spoke list', () => {
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    for (const s of radar.series) expect(s.values).toHaveLength(radar.axes.length)
  })

  it('keeps every plotted value inside the 0-100 radius', () => {
    const radar = buildCohortRadar(radarPatients, radarCohorts)
    for (const s of radar.series) {
      for (const v of s.values) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('never emits NaN for a patient with no conditions or no readings', () => {
    const withGaps = radarPatients.map((p, index) =>
      index === 0
        ? { ...p, conditions: null as never, hba1c: null, systolic_bp: null, condition_count: null as never }
        : p,
    )
    const radar = buildCohortRadar(withGaps, radarCohorts)
    expect(radar.axes.length).toBeGreaterThanOrEqual(3)
    for (const s of radar.series) {
      for (const v of s.values) expect(Number.isFinite(v)).toBe(true)
    }
    for (const axis of radar.axes) {
      expect(Number.isFinite(axis.spread)).toBe(true)
      expect(Number.isFinite(axis.prevalence)).toBe(true)
    }
  })

  it('refuses to draw a radar from fewer than three comparable cohorts', () => {
    // Two spokes is a line segment, not a distribution. Rendering it would imply a shape
    // the data cannot support.
    const only = radarCohorts.filter((c) => c.name === 'Anemia (disorder)' || c.name === 'Gingivitis (disorder)')
    expect(buildCohortRadar(radarPatients, only)).toEqual({ axes: [], series: [] })
  })

  it('caps the spoke count so no vertex is too cramped to read', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      code: `many-${i}`,
      name: `Condition ${i} (disorder)`,
      category: null,
      patient_count: 9,
      prevalence_pct: 64,
    }))
    // Each extra cohort is carried by roughly two thirds of the population, skewed so the
    // groups differ — 12 more qualifying spokes than the chart has room for.
    const crowded = radarPatients.map((p, index) => ({
      ...p,
      conditions: [
        ...(p.conditions ?? []),
        ...Array.from({ length: 12 }, (_, i) => `Condition ${i} (disorder)`).filter(
          (_, i) => (i + index) % 3 !== 0,
        ),
      ],
    }))
    const radar = buildCohortRadar(crowded, [...radarCohorts, ...many])
    expect(radar.axes).toHaveLength(6)
  })
})
