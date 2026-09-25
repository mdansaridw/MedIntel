import { Dna } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { getCohortSummaries } from '../../data/selectors'
import { CohortCard } from './components/CohortCard'

const cohortSummaries = getCohortSummaries()

export default function CohortsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sectors"
        title="Disease Cohorts"
        description="Explore synthetic disease cohorts and their patient distributions."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <Dna aria-hidden="true" className="size-4 text-accent-strong" />
            {cohortSummaries.length} cohorts
          </span>
        }
      />
      <PageContainer>
        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Disease cohorts"
        >
          {cohortSummaries.map((cohort) => (
            <CohortCard key={cohort.id} cohort={cohort} />
          ))}
        </section>
      </PageContainer>
    </>
  )
}
