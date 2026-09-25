import { CalendarDays, MapPin, Phone, UserRound } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockCohorts } from '../../../data/mockCohorts'
import { formatDate } from '../../../lib/format'
import type { Patient } from '../../../types/clinical'

export function PatientCard({ patient }: { patient: Patient }) {
  const conditions = patient.conditionIds
    .map((conditionId) => mockCohorts.find((cohort) => cohort.id === conditionId)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <Card className="flex min-h-72 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <UserRound aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-[-0.02em] text-ink">{patient.id}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{patient.name}</p>
          </div>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      <div className="mt-5 space-y-2.5 text-sm text-ink-muted">
        <div className="flex items-start gap-2.5">
          <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          <span>{patient.mobile}</span>
        </div>
        <div className="flex items-start gap-2.5">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          <span className="line-clamp-2 leading-5">{patient.address}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span>{patient.age} years</span>
          <span className="size-1 rounded-full bg-ink-muted" />
          <span>{patient.sex}</span>
        </div>
      </div>

      <div className="mt-5 flex min-h-14 flex-wrap content-start gap-1.5">
        {conditions.slice(0, 2).map((condition) => (
          <span
            key={condition}
            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted"
          >
            {condition}
          </span>
        ))}
        {conditions.length > 2 && (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
            +{conditions.length - 2}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-muted">
        <CalendarDays aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        Last visit {formatDate(patient.lastConsultation)}
      </div>
    </Card>
  )
}
