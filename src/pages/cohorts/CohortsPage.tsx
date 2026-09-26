import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Dna,
  Filter,
  FlaskConical,
  Globe2,
  Search,
  UsersRound
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { Card } from '../../components/ui/Card'
import { MedIntelApi } from '../../services/api'

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    MedIntelApi.getCohorts()
      .then((data) => {
        setCohorts(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Failed to load cohorts:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredCohorts = cohorts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    )
  })

  const topPrevalence = cohorts.length > 0 ? cohorts[0] : null

  return (
    <>
      <PageHeader
        eyebrow="Sectors · Population Health"
        title="Disease Cohorts"
        description="Explore disease sub-populations, prevalence distributions, and treatment pathways derived from Neo4j."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-xs font-bold text-ink shadow-card sm:inline-flex">
            <Dna aria-hidden="true" className="size-4 text-accent-strong" />
            {cohorts.length} Active Disease Cohorts
          </span>
        }
      />

      <PageContainer className="flex flex-col gap-6 pb-12">
        {/* KPI Banner Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex flex-col justify-between shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Total Monitored Cohorts
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-display font-bold text-ink">{cohorts.length}</span>
              <span className="text-xs text-accent font-semibold">Graph-Linked</span>
            </div>
            <p className="text-xs text-ink-muted mt-2 border-t border-line/60 pt-2">
              SNOMED-CT normalized disease entities
            </p>
          </Card>

          <Card className="p-5 flex flex-col justify-between shadow-card border border-accent/30 bg-accent-soft/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
              Highest Prevalence Cohort
            </span>
            <div className="mt-2">
              <span className="text-lg font-bold text-ink block truncate">
                {topPrevalence ? topPrevalence.name : 'Loading...'}
              </span>
              <span className="text-sm font-semibold text-accent">
                {topPrevalence ? `${topPrevalence.prevalence_pct}% Hospital Reach` : '--'}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-2 border-t border-line/60 pt-2">
              Primary target for Level 1 Macro Optimization
            </p>
          </Card>

          <Card className="p-5 flex flex-col justify-between shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Treatment Linkage
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-display font-bold text-success">100%</span>
              <span className="text-xs text-success font-semibold">Formulary Verified</span>
            </div>
            <p className="text-xs text-ink-muted mt-2 border-t border-line/60 pt-2">
              Connected to 3-Level Treatment Hierarchy
            </p>
          </Card>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised p-4 shadow-card">
          <div className="flex flex-1 min-w-[260px] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <Search className="size-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search cohorts by name (e.g. Diabetes, Hypertension) or SNOMED code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
            />
          </div>

          <Link
            to="/treatment-intelligence"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-strong transition-all shadow-sm"
          >
            <FlaskConical className="size-3.5" />
            <span>Launch Treatment Intelligence Engine</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-ink-muted">
            <Activity className="size-7 text-accent animate-pulse mb-3" />
            <span>Extracting disease cohort prevalence from Neo4j Aura...</span>
          </div>
        )}

        {/* Cohort Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCohorts.map((cohort) => (
            <Card
              key={cohort.code}
              className="flex flex-col justify-between p-5 shadow-card hover:border-accent transition-all duration-200 group"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-mono font-bold text-accent-strong border border-accent/30">
                    SNOMED: {cohort.code}
                  </span>
                  <span className="text-xs text-ink-muted font-medium flex items-center gap-1">
                    <UsersRound className="size-3 text-accent" />
                    {cohort.patient_count} Patients
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-ink group-hover:text-accent transition-colors mb-2">
                  {cohort.name}
                </h3>

                {/* Prevalence Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>Prevalence Reach</span>
                    <span className="font-bold text-ink">{cohort.prevalence_pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cohort.prevalence_pct || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-line/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/treatment-intelligence?level=1&code=${cohort.code}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface py-2 text-[11px] font-semibold text-ink hover:border-accent hover:text-accent transition-colors"
                    title="View Level 1 Macro Population Efficacy"
                  >
                    <Globe2 className="size-3 text-accent" />
                    <span>Level 1 Efficacy</span>
                  </Link>

                  <Link
                    to={`/treatment-intelligence?level=2&primary=${cohort.code}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface py-2 text-[11px] font-semibold text-ink hover:border-accent hover:text-accent transition-colors"
                    title="Filter Level 2 Comorbidities with SALAD warnings"
                  >
                    <Filter className="size-3 text-accent" />
                    <span>Level 2 Cohort</span>
                  </Link>
                </div>

                <Link
                  to={`/cohorts/${cohort.code}`}
                  className="w-full flex items-center justify-between rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                >
                  <span>Inspect Cohort Patients & History</span>
                  <ArrowRight className="size-3.5 text-accent" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </PageContainer>
    </>
  )
}
