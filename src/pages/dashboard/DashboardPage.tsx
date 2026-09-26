import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageContainer } from '../../components/ui/PageContainer'
import { MedIntelApi } from '../../services/api'
import { CohortRadarChart } from './components/CohortRadarChart'
import {
  buildCohortRadar,
  computeDashboardMetrics,
  EMPTY_COHORT_RADAR,
} from './lib/dashboardMetrics'
import type { AdminStatsResponse, CohortRecord, PatientRecord } from './types'

/** The whole population is well under this, so one request is enough. */
const PATIENT_FETCH_LIMIT = 500

interface DashboardData {
  patients: PatientRecord[]
  cohorts: CohortRecord[]
  counts?: AdminStatsResponse['counts']
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [syncedAt, setSyncedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setFailed([])

    // allSettled so one unavailable endpoint degrades the dashboard instead of blanking it.
    const [patients, cohorts, stats] = await Promise.allSettled([
      MedIntelApi.getPatients(PATIENT_FETCH_LIMIT),
      MedIntelApi.getCohorts(),
      MedIntelApi.getAdminStats(),
    ])

    const failures: string[] = []
    if (patients.status === 'rejected') failures.push('patients')
    if (cohorts.status === 'rejected') failures.push('cohorts')
    if (stats.status === 'rejected') failures.push('graph telemetry')

    if (patients.status === 'fulfilled' && cohorts.status === 'fulfilled') {
      setData({
        patients: patients.value,
        cohorts: cohorts.value,
        counts: stats.status === 'fulfilled' ? stats.value.counts : undefined,
      })
      setSyncedAt(new Date().toLocaleTimeString())
    }

    setFailed(failures)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const metrics = useMemo(
    () => (data ? computeDashboardMetrics(data.patients, data.cohorts, data.counts) : []),
    [data],
  )
  const radar = useMemo(
    () => (data ? buildCohortRadar(data.patients, data.cohorts) : EMPTY_COHORT_RADAR),
    [data],
  )

  return (
    <>
      <PageHeader
        eyebrow="Clinical overview"
        title="Hello there Jerrish!"
        description="Live cohort risk stratification and care-gap telemetry from the Neo4j clinical graph."
        action={
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-xs font-bold text-ink shadow-card transition-colors hover:border-accent disabled:opacity-60 sm:inline-flex"
          >
            <RefreshCw className={`size-4 text-accent-strong ${isLoading ? 'animate-spin' : ''}`} />
            {syncedAt ? (
              <>
                Synced <span className="numeric">{syncedAt}</span>
              </>
            ) : (
              'Sync'
            )}
          </button>
        }
      />

      <PageContainer className="flex flex-col gap-6 lg:gap-8">
        {failed.length > 0 && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-ink"
          >
            <TriangleAlert aria-hidden="true" className="size-4.5 shrink-0 text-warning" />
            <span>
              Could not reach {failed.join(', ')}. Affected figures are omitted rather than
              estimated.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-accent">
            <Activity className="size-5 animate-pulse" />
            <span className="text-sm font-medium">Querying the clinical knowledge graph...</span>
          </div>
        ) : data ? (
          <>
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Dashboard summary metrics"
            >
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  metric={metric}
                  icon={metric.icon}
                />
              ))}
            </section>

            <Card
              // No `flex-1` here: the parent is a column flex container, so flex-1 would
              // set flex-basis to 0 and pin the card at its min-height while the chart
              // inside it overflowed on top of itself. Content drives the height.
              className="flex shrink-0 flex-col gap-6 p-5 sm:p-6"
              aria-label="Cohort disease distribution"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                    Cohort Disease Distribution
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    How the <span className="numeric">{data.patients.length}</span> de-identified
                    patients divide across clinical groups, and which diseases separate them.
                    Spokes are the disease cohorts that differ most between groups.
                  </p>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-strong">
                  <span className="numeric">{data.cohorts.length}</span> cohorts
                </span>
              </div>

              <CohortRadarChart radar={radar} />
            </Card>
          </>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <TriangleAlert aria-hidden="true" className="size-7 text-warning" />
            <p className="text-sm font-medium text-ink">Clinical graph unavailable</p>
            <p className="max-w-md text-xs text-ink-muted">
              The dashboard needs both the patient and cohort endpoints. Start the Flask
              backend on port 5000, then retry.
            </p>
            <button
              type="button"
              onClick={load}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-strong"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Retry
            </button>
          </Card>
        )}
      </PageContainer>
    </>
  )
}
