import { Activity, ArrowUpRight, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { getPrimaryCondition } from '../../../data/mockPatients'
import type { TreatmentProfile } from '../../../types/clinical'
import type { Patient } from '../../../types/clinical'

export function TreatmentPatientCard({
  patient,
  profile,
}: {
  patient: Patient
  profile: TreatmentProfile
}) {
  const condition = getPrimaryCondition(patient)

  return (
    <Link
      to={`/treatment-intelligence/${patient.id}`}
      className="group block rounded-[20px] focus-visible:outline-offset-4"
      aria-label={`Open treatment intelligence for ${patient.id}`}
    >
      <Card className="flex min-h-64 flex-col p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-1 group-hover:border-accent">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <FlaskConical aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-strong"
          />
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-accent-strong">
            {condition.category}
          </p>
          <h2 className="numeric mt-1 text-2xl font-semibold tracking-[-0.025em] text-ink">
            {patient.id}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{patient.name}</p>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Control score
              </p>
              <p className="mt-1 text-sm font-bold text-ink">{profile.controlLabel}</p>
            </div>
            <p className="numeric text-3xl font-semibold leading-none text-ink">
              {profile.controlScore}
              <span className="font-sans text-xs font-medium text-ink-muted"> / 100</span>
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${profile.controlScore}%` }}
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
            <Activity aria-hidden="true" className="size-3.5" />
            {profile.biomarker.name}
          </p>
        </div>
      </Card>
    </Link>
  )
}
