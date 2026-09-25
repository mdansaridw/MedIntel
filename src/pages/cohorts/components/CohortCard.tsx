import { ArrowUpRight, Dna, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { NumericText } from '../../../components/ui/NumericText'
import { TrendBadge } from '../../../components/ui/StatusBadge'
import type { CohortSummary } from '../../../types/clinical'

export function CohortCard({ cohort }: { cohort: CohortSummary }) {
  return (
    <Link
      to={`/cohorts/${cohort.id}`}
      className="group block rounded-[20px] focus-visible:outline-offset-4"
      aria-label={`Open ${cohort.name} cohort`}
    >
      <Card className="flex min-h-72 flex-col p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-1 group-hover:border-accent">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <Dna aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-strong"
          />
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-accent-strong">
            {cohort.category}
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink">
            <NumericText text={cohort.name} />
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink-muted">{cohort.description}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Patients
            </p>
            <p className="numeric mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
              <UsersRound aria-hidden="true" className="size-3.5 text-accent-strong" />
              {cohort.affectedPatients}
              <span className="font-normal text-ink-muted">/ 30</span>
            </p>
          </div>
          <TrendBadge trend={cohort.trend} />
        </div>
      </Card>
    </Link>
  )
}
