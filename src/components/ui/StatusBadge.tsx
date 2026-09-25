import { CircleAlert, CircleCheck, Clock3 } from 'lucide-react'
import type { ClinicalTrend, PatientStatus } from '../../types/clinical'
import { cn } from '../../lib/cn'

const statusStyles: Record<PatientStatus, string> = {
  Stable: 'bg-success-soft text-success',
  Monitoring: 'bg-warning-soft text-warning',
  Critical: 'bg-danger-soft text-danger',
}

const trendStyles: Record<ClinicalTrend, string> = {
  Increasing: 'bg-danger-soft text-danger',
  Stable: 'bg-accent-soft text-accent-strong',
  Decreasing: 'bg-success-soft text-success',
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  const Icon = status === 'Stable' ? CircleCheck : status === 'Monitoring' ? Clock3 : CircleAlert

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        statusStyles[status],
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </span>
  )
}

export function TrendBadge({ trend }: { trend: ClinicalTrend }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        trendStyles[trend],
      )}
    >
      {trend}
    </span>
  )
}
