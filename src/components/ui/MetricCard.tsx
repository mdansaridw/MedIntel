import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { DashboardMetric } from '../../types/clinical'
import { Card } from './Card'

export function MetricCard({ metric, icon: Icon }: { metric: DashboardMetric; icon: LucideIcon }) {
  const TrendIcon =
    metric.direction === 'up' ? TrendingUp : metric.direction === 'down' ? TrendingDown : Minus

  return (
    <Card className="flex min-h-56 flex-col justify-between p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-muted">
          <TrendIcon aria-hidden="true" className="size-3.5" />
          {metric.change}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-ink-muted">{metric.label}</p>
        <p className="numeric mt-1 text-5xl font-semibold leading-none text-ink">
          {metric.value}
        </p>
        <p className="mt-3 text-xs text-ink-muted">{metric.detail}</p>
      </div>
    </Card>
  )
}
