import { ArrowLeft, Dna, MapPin, TrendingUp, UserRound, UsersRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { PageContainer } from '../../components/ui/PageContainer'
import { StatusBadge, TrendBadge } from '../../components/ui/StatusBadge'
import { getPatientById } from '../../data/mockPatients'
import { getCohortSummary } from '../../data/selectors'
import { formatPercent } from '../../lib/format'
import type { Patient } from '../../types/clinical'

export default function CohortDetailsPage() {
  const { cohortId = '' } = useParams()
  const cohort = getCohortSummary(cohortId)
  const patients =
    cohort?.patientIds
      .map((patientId) => getPatientById(patientId))
      .filter((patient): patient is Patient => Boolean(patient)) ?? []

  if (!cohort) {
    return (
      <>
        <PageHeader eyebrow="Cohorts" title="Cohort not found" />
        <PageContainer>
          <Card className="p-8 text-sm text-ink-muted">
            The requested disease cohort does not exist.
          </Card>
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={`${cohort.category} cohort`}
        title={cohort.name}
        description={cohort.description}
        action={
          <Link
            to="/cohorts"
            className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:border-accent sm:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All cohorts
          </Link>
        }
      />

      <PageContainer className="flex flex-col gap-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={UsersRound}
            label="Affected patients"
            value={`${cohort.affectedPatients} / 30`}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Directory prevalence"
            value={`${formatPercent(cohort.prevalence)}%`}
          />
          <SummaryCard icon={Dna} label="Clinical category" value={cohort.category} />
          <Card className="flex min-h-32 flex-col justify-between p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Trend</p>
            <div>
              <TrendBadge trend={cohort.trend} />
            </div>
          </Card>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-strong">
                Associated directory
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                Patients in this cohort
              </h2>
            </div>
            <p className="text-sm font-medium text-ink-muted">{patients.length} records</p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {patients.map((patient) => (
              <Card key={patient.id} className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                  <UserRound aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{patient.id}</p>
                    <span className="text-xs text-ink-muted">{patient.name}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    {patient.address}
                  </p>
                </div>
                <StatusBadge status={patient.status} />
              </Card>
            ))}
          </div>
        </section>
      </PageContainer>
    </>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound
  label: string
  value: string
}) {
  return (
    <Card className="flex min-h-32 flex-col justify-between p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
        <Icon aria-hidden="true" className="size-4 text-accent-strong" strokeWidth={1.8} />
      </div>
      <p className="numeric truncate text-3xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
    </Card>
  )
}
