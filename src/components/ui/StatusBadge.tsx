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

export interface StatusBadgeProps {
  status?: PatientStatus
  intent?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}

export function StatusBadge({ status, intent = 'default', size = 'md', children, className }: StatusBadgeProps) {
  if (status) {
    const Icon = status === 'Stable' ? CircleCheck : status === 'Monitoring' ? Clock3 : CircleAlert
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
          statusStyles[status],
          className
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {status}
      </span>
    )
  }

  const intentStyles = {
    default: 'bg-surface-muted text-ink border border-line',
    success: 'bg-success-soft text-success border border-success/30',
    warning: 'bg-warning-soft text-warning border border-warning/30',
    danger: 'bg-danger-soft text-danger border border-danger/30',
    accent: 'bg-accent-soft text-accent-strong border border-accent/30',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        intentStyles[intent],
        sizeStyles[size],
        className
      )}
    >
      {children}
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
