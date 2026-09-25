import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  HeartPulse,
  Pill,
  Stethoscope,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { NumericText } from '../../components/ui/NumericText'
import { PageContainer } from '../../components/ui/PageContainer'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getPatientById, getPrimaryCondition } from '../../data/mockPatients'
import { getTreatmentProfile } from '../../data/mockTreatments'
import { formatDate } from '../../lib/format'

export default function PatientIntelligencePage() {
  const { patientId = '' } = useParams()
  const patient = getPatientById(patientId)
  const profile = getTreatmentProfile(patientId)

  if (!patient || !profile) {
    return (
      <>
        <PageHeader eyebrow="Research" title="Patient intelligence not found" />
        <PageContainer>
          <Card className="p-8 text-sm text-ink-muted">
            The requested treatment profile does not exist.
          </Card>
        </PageContainer>
      </>
    )
  }

  const condition = getPrimaryCondition(patient)

  return (
    <>
      <PageHeader
        eyebrow={`${patient.id} · ${condition.name}`}
        title="Treatment Intelligence"
        description={`${patient.name} · Synthetic demonstration profile`}
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong">
              Demo data
            </span>
            <Link
              to="/treatment-intelligence"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:border-accent"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              All patients
            </Link>
          </div>
        }
      />

      <PageContainer className="flex flex-col gap-6 lg:gap-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailMetric
            icon={Gauge}
            label="Control score"
            value={`${profile.controlScore}/100`}
            detail={profile.controlLabel}
          />
          <DetailMetric
            icon={Activity}
            label={profile.biomarker.name}
            value={`${profile.biomarker.value} ${profile.biomarker.unit}`}
            detail={`Target ${profile.biomarker.target}`}
          />
          <DetailMetric
            icon={HeartPulse}
            label="Primary cohort"
            value={condition.name}
            detail={condition.category}
          />
          <DetailMetric
            icon={CalendarClock}
            label="Next review"
            value={formatDate(profile.nextReview)}
            detail="Scheduled follow-up"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="flex flex-col gap-6">
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-strong">
                    Biomarker calibration
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    <NumericText text={profile.biomarker.name} />
                  </h2>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong">
                  {profile.biomarker.status}
                </span>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-end">
                <div>
                  <p className="numeric text-6xl font-semibold leading-none text-ink">
                    {profile.biomarker.value}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">{profile.biomarker.unit}</p>
                </div>
                <div className="pb-1">
                  <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                    <span>Observed</span>
                    <span>Target {profile.biomarker.target}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${profile.controlScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-line p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-strong">
                  Ranked options
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                  Therapy comparison
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      <th className="px-6 py-3 font-bold">Therapy</th>
                      <th className="px-4 py-3 font-bold">Line</th>
                      <th className="px-4 py-3 font-bold">Efficacy</th>
                      <th className="px-4 py-3 font-bold">Recovery</th>
                      <th className="px-6 py-3 text-right font-bold">Cohort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.therapies.map((therapy) => (
                      <tr key={therapy.name} className="border-b border-line last:border-0">
                        <td className="px-6 py-4 text-sm font-semibold text-ink">{therapy.name}</td>
                        <td className="px-4 py-4 text-sm text-ink-muted">{therapy.line}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${therapy.efficacy}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-ink">{therapy.efficacy}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-ink-muted">
                          {therapy.recoveryRate}%
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-ink-muted">
                          n = {therapy.cohortSize}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="p-5 sm:p-6">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                <Stethoscope aria-hidden="true" className="size-5" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
                Procedures
              </h2>
              <ul className="mt-4 space-y-3">
                {profile.procedures.map((procedure) => (
                  <li key={procedure} className="flex items-start gap-2.5 text-sm leading-5 text-ink-muted">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-accent-strong"
                    />
                    {procedure}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                  <ClipboardList aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-muted">
                    Recommendation
                  </p>
                  <p className="text-sm font-semibold text-ink">Clinical review</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-muted">{profile.recommendation}</p>
              <div className="mt-5 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
                This interface uses synthetic demonstration values and is not intended for clinical
                decision-making.
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Pill aria-hidden="true" className="size-5 text-accent-strong" />
                <p className="text-sm font-semibold text-ink">Current patient status</p>
              </div>
              <div className="mt-4">
                <StatusBadge status={patient.status} />
              </div>
            </Card>
          </div>
        </section>
      </PageContainer>
    </>
  )
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="flex min-h-40 flex-col justify-between p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
        <Icon aria-hidden="true" className="size-4 text-accent-strong" strokeWidth={1.8} />
      </div>
      <div>
        <p className="numeric truncate text-3xl font-semibold tracking-[-0.03em] text-ink">
          {value}
        </p>
        <p className="mt-1 text-xs text-ink-muted">{detail}</p>
      </div>
    </Card>
  )
}
