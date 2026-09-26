import type { LucideIcon } from 'lucide-react'

/** A de-identified patient row from `GET /api/patients` (Neo4j Vault 2, zero direct PII). */
export interface PatientRecord {
  id: string
  name: string
  birth_year: number | null
  gender: string | null
  race: string | null
  bmi: number | null
  systolic_bp: number | null
  diastolic_bp: number | null
  hba1c: number | null
  condition_count: number | null
  /** Distinct medications the patient is prescribed, from the `PRESCRIBED` relationship. */
  medication_count: number | null
  conditions: string[]
}

/** A SNOMED-CT normalized disease cohort from `GET /api/cohorts`. */
export interface CohortRecord {
  code: string
  name: string
  category: string | null
  patient_count: number
  prevalence_pct: number
}

/**
 * Graph-wide counters from `GET /api/admin/stats`.
 *
 * Every field is a live Cypher count. There is deliberately no `observations` entry:
 * the graph has no such node label, and a previously hardcoded 68,649 made the node
 * total read ~110x larger than reality.
 */
export interface GraphCounts {
  patients: number
  conditions: number
  medications: number
  allergies: number
  pharmacy_items: number
  supply_items: number
  total_nodes: number
  total_edges: number
}

export interface AdminStatsResponse {
  timestamp: string
  status: string
  counts: GraphCounts
  response_time_ms: number
}

export interface HealthResponse {
  status: string
  database: string
}

/**
 * A dashboard metric backed by live graph data.
 *
 * `change` is intentionally optional: the Synthea graph is a static snapshot with no
 * time dimension, so a directional delta would be fabricated. When present it carries
 * a real secondary statistic and `direction` stays undefined (rendered neutral).
 */
export interface LiveMetric {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  change?: string
  direction?: 'up' | 'down' | 'neutral'
}

/** One radar spoke: a disease cohort the chart compares across patient subgroups. */
export interface RadarAxis {
  key: string
  /** Trimmed SNOMED-CT name for the rim label, e.g. "Essential hypertension". */
  label: string
  /** Full cohort name, used in tooltips and the screen-reader table. */
  cohortName: string
  cohortCode: string
  /** Patients in the whole population carrying this diagnosis. */
  patientCount: number
  /** Prevalence across the whole population, 0-100. */
  prevalence: number
  /**
   * Largest prevalence gap between any two subgroups, in percentage points. This is the
   * selection criterion for the spokes: an axis every group scores alike carries no
   * information and flattens the polygons into each other.
   */
  spread: number
}

/** One radar polygon: a patient subgroup and its prevalence per spoke. */
export interface RadarSeries {
  key: string
  label: string
  /** Hex fill/stroke colour, legible on both the light and dark surfaces. */
  color: string
  /** Patients in this subgroup. */
  size: number
  /** Prevalence per spoke, 0-100, positionally aligned to `CohortRadar.axes`. */
  values: number[]
}

export interface CohortRadar {
  axes: RadarAxis[]
  series: RadarSeries[]
}
