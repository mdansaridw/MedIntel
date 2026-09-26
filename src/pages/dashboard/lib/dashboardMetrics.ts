import { Activity, Dna, HeartPulse, UsersRound } from 'lucide-react'
import type {
  CohortRadar,
  CohortRecord,
  GraphCounts,
  LiveMetric,
  PatientRecord,
  RadarAxis,
  RadarSeries,
} from '../types'

/**
 * Clinical thresholds. The BMI/BP pairs are standard diagnostic cut-offs; `conditionBurden`
 * is the point at which a patient's record stops being routine.
 */
export const THRESHOLDS = {
  bmiLower: 18.5,
  bmiUpper: 24.9,
  systolicTarget: 130,
  diastolicTarget: 80,
  systolicHigh: 140,
  diastolicHigh: 90,
  hba1cDiabetes: 6.5,
  conditionBurden: 10,
} as const

/** Spokes on the radar. Six keeps each vertex readable at the card's width. */
const RADAR_AXIS_COUNT = 6

/**
 * A cohort needs at least this many patients before it can define a spoke. Below it a
 * single patient swings a subgroup's prevalence by tens of points, which reads as a real
 * difference but is sampling noise.
 */
const RADAR_MIN_COHORT_PATIENTS = 5

/** Series palette — legible on both the light (#fbfaf7) and dark (#292927) surfaces. */
export const RADAR_SERIES_COLORS = {
  population: '#579ad9',
  diabetes: '#c084fc',
  hypertension: '#34d399',
  burden: '#f0a132',
} as const

const CURRENT_YEAR = new Date().getFullYear()

function collect(
  patients: PatientRecord[],
  pick: (p: PatientRecord) => number | null | undefined,
): number[] {
  return patients.map(pick).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

function safeMean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function ageOf(patient: PatientRecord): number | null {
  if (typeof patient.birth_year !== 'number') return null
  return CURRENT_YEAR - patient.birth_year
}

/** Case-insensitive match against a patient's condition list. */
function hasCondition(patient: PatientRecord, ...needles: string[]): boolean {
  return (patient.conditions ?? []).some((condition) => {
    const name = condition.toLowerCase()
    return needles.some((needle) => name.includes(needle))
  })
}

export const isDiabetic = (p: PatientRecord) =>
  (p.hba1c ?? 0) >= THRESHOLDS.hba1cDiabetes || hasCondition(p, 'diabetes')

export const isHypertensive = (p: PatientRecord) =>
  (p.systolic_bp ?? 0) >= THRESHOLDS.systolicHigh ||
  (p.diastolic_bp ?? 0) >= THRESHOLDS.diastolicHigh ||
  hasCondition(p, 'hypertension')

export const isBmiInTarget = (p: PatientRecord) =>
  typeof p.bmi === 'number' && p.bmi >= THRESHOLDS.bmiLower && p.bmi <= THRESHOLDS.bmiUpper

export const isBpInTarget = (p: PatientRecord) =>
  typeof p.systolic_bp === 'number' &&
  typeof p.diastolic_bp === 'number' &&
  p.systolic_bp < THRESHOLDS.systolicTarget &&
  p.diastolic_bp < THRESHOLDS.diastolicTarget

/** Share of `part` within `whole`, as a percentage rounded to one decimal. */
const rate = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10

const formatPct = (value: number) => `${Math.round(value * 10) / 10}%`

const toGoal = (count: number) => `${count} ${count === 1 ? 'patient' : 'patients'} to goal`

/**
 * Builds the four headline cards from live graph data.
 *
 * The clinical graph is a static snapshot, so the chip on each card carries a real
 * secondary statistic rather than a fabricated period-over-period delta.
 */
export function computeDashboardMetrics(
  patients: PatientRecord[],
  cohorts: CohortRecord[],
  counts?: GraphCounts,
): LiveMetric[] {
  const metrics: LiveMetric[] = []
  const total = patients.length
  const disorderCohorts = cohorts.filter((c) => c.name.endsWith('(disorder)')).length

  metrics.push({
    label: 'Patients in Graph',
    value: (counts?.patients ?? total).toLocaleString(),
    icon: UsersRound,
    change: counts ? `${counts.total_edges.toLocaleString()} edges` : undefined,
    detail: 'De-identified UUID profiles · Vault 2 isolated from PII',
  })

  metrics.push({
    label: 'Disease Cohorts',
    value: cohorts.length.toLocaleString(),
    icon: Dna,
    change: `${disorderCohorts} disorder-class`,
    detail: 'SNOMED-CT normalized conditions across the population',
  })

  if (total > 0) {
    const bmiInTarget = patients.filter(isBmiInTarget).length
    const meanBmi = safeMean(collect(patients, (p) => p.bmi))

    metrics.push({
      label: 'BMI In Target',
      value: formatPct(rate(bmiInTarget, total)),
      icon: Activity,
      change: meanBmi === null ? undefined : `mean ${meanBmi.toFixed(1)}`,
      detail: `BMI ${THRESHOLDS.bmiLower}–${THRESHOLDS.bmiUpper} kg/m² · ${toGoal(total - bmiInTarget)}`,
    })

    const bpInTarget = patients.filter(isBpInTarget).length
    const meanSbp = safeMean(collect(patients, (p) => p.systolic_bp))
    const meanDbp = safeMean(collect(patients, (p) => p.diastolic_bp))

    metrics.push({
      label: 'BP At Target',
      value: formatPct(rate(bpInTarget, total)),
      icon: HeartPulse,
      change:
        meanSbp === null || meanDbp === null
          ? undefined
          : `mean ${Math.round(meanSbp)}/${Math.round(meanDbp)}`,
      detail: `Under ${THRESHOLDS.systolicTarget}/${THRESHOLDS.diastolicTarget} mmHg · ${toGoal(total - bpInTarget)}`,
    })
  }

  return metrics
}

/** Strips the SNOMED-CT semantic tag so a rim label reads as a disease, not a code. */
function shortCohortLabel(name: string): string {
  const trimmed = name.replace(/\s*\((disorder|finding|situation|morphologic abnormality)\)\s*$/i, '')
  return trimmed.length > 22 ? `${trimmed.slice(0, 21).trimEnd()}…` : trimmed
}

interface Subgroup {
  key: string
  label: string
  color: string
  members: PatientRecord[]
}

/**
 * Compares disease cohorts across patient subgroups on a radar.
 *
 * Spokes are the disease cohorts that best separate the subgroups, and each polygon is
 * one subgroup's prevalence on those spokes. Two properties of this graph drive the design:
 *
 * 1. Cohort prevalence is only comparable where a cohort joins to a patient's condition
 *    list. 22 of 186 cohorts match nobody — including the four most "prevalent" ones
 *    ("Medication review due" at 100%, "Full-time employment" at 77.8%), which are social
 *    and administrative findings rather than diseases. Ranking spokes by raw `prevalence_pct`
 *    would therefore draw mostly flat, meaningless axes.
 * 2. A spoke every subgroup scores alike carries no information. Spokes are chosen by the
 *    spread between the highest and lowest subgroup, so the polygons have real shape
 *    (measured 8-20pp mean pairwise gap, versus 5.9pp for the threshold-based radar this
 *    replaced). Spokes are then ordered by population prevalence so the outline reads
 *    consistently from wide to narrow.
 */
export function buildCohortRadar(
  patients: PatientRecord[],
  cohorts: CohortRecord[],
): CohortRadar {
  if (patients.length === 0 || cohorts.length === 0) return { axes: [], series: [] }

  const subgroups: Subgroup[] = [
    { key: 'population', label: 'All patients', color: RADAR_SERIES_COLORS.population, members: patients },
    { key: 'diabetes', label: 'Diabetes / prediabetes', color: RADAR_SERIES_COLORS.diabetes, members: patients.filter(isDiabetic) },
    { key: 'hypertension', label: 'Hypertension', color: RADAR_SERIES_COLORS.hypertension, members: patients.filter(isHypertensive) },
    {
      key: 'burden',
      label: `High care burden (${THRESHOLDS.conditionBurden}+ conditions)`,
      color: RADAR_SERIES_COLORS.burden,
      members: patients.filter((p) => (p.condition_count ?? 0) >= THRESHOLDS.conditionBurden),
    },
  ]

  // A subgroup nobody belongs to has no prevalence to plot.
  const active = subgroups.filter((s) => s.members.length > 0)
  if (active.length === 0) return { axes: [], series: [] }

  // One lowercased condition Set per patient, so a prevalence scan is a Set lookup.
  const conditionSets = patients.map((p) => new Set((p.conditions ?? []).map((c) => c.toLowerCase())))

  const tally = (needle: string, members: PatientRecord[]) => {
    if (members.length === 0) return { hits: 0, pct: 0 }
    const memberIds = new Set(members.map((m) => m.id))
    let hits = 0
    for (let i = 0; i < patients.length; i += 1) {
      if (memberIds.has(patients[i].id) && conditionSets[i].has(needle)) hits += 1
    }
    return { hits, pct: (hits / members.length) * 100 }
  }

  // Prefer genuine diagnoses; fall back to any joinable cohort if too few disorders exist.
  const joinable = cohorts.filter((c) => conditionSets.some((set) => set.has(c.name.toLowerCase())))
  const disorders = joinable.filter((c) => /\(disorder\)\s*$/i.test(c.name))
  const candidates = disorders.length >= RADAR_AXIS_COUNT ? disorders : joinable

  const scored: RadarAxis[] = candidates
    .map((c) => {
      const needle = c.name.toLowerCase()
      // The cohort size and its percentage come from the same scan, so the axis header can
      // never contradict itself. `CohortRecord.patient_count` is deliberately not used: it is
      // the graph's own tally, and it is the figure that disagrees with the patient list for
      // exactly those cohorts this filter throws away.
      const overall = tally(needle, patients)
      if (overall.hits < RADAR_MIN_COHORT_PATIENTS) return null

      const values = active.map((s) => tally(needle, s.members).pct)
      return {
        key: c.code || c.name,
        label: shortCohortLabel(c.name),
        cohortName: c.name,
        cohortCode: c.code,
        patientCount: overall.hits,
        prevalence: overall.pct,
        spread: Math.max(...values) - Math.min(...values),
      }
    })
    .filter((axis): axis is RadarAxis => axis !== null)
    // A spoke nobody separates is a flat line at the same radius for every polygon.
    .filter((axis) => axis.spread > 0)
    .sort((a, b) => b.spread - a.spread)
    .slice(0, RADAR_AXIS_COUNT)
    // Draw widest-first so the polygon outline descends predictably.
    .sort((a, b) => b.prevalence - a.prevalence)

  if (scored.length < 3) return { axes: [], series: [] }

  const series: RadarSeries[] = active.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    size: s.members.length,
    values: scored.map((axis) => tally(axis.cohortName.toLowerCase(), s.members).pct),
  }))

  return { axes: scored, series }
}

/** The shape rendered before any graph data arrives, so the card needs no null guards. */
export const EMPTY_COHORT_RADAR: CohortRadar = { axes: [], series: [] }
