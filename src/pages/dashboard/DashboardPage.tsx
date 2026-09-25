import { Activity, Dna, TrendingUp, UsersRound } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageContainer } from '../../components/ui/PageContainer'
import { dashboardMetrics } from '../../data/mockDashboard'

const metricIcons = [UsersRound, Dna, TrendingUp, Activity]

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Clinical overview"
        title="Hello there Jerrish!"
        description="A concise view of the clinical intelligence workspace."
      />
      <PageContainer className="flex flex-col gap-6 lg:gap-8">
        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Dashboard summary metrics"
        >
          {dashboardMetrics.map((metric, index) => {
            const Icon = metricIcons[index]
            return <MetricCard key={metric.label} metric={metric} icon={Icon} />
          })}
        </section>

        <Card
          className="min-h-[28rem] flex-1"
          aria-label="Reserved dashboard overview area"
        />
      </PageContainer>
    </>
  )
}
