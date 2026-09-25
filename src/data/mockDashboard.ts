import type { DashboardMetric } from '../types/clinical'

export const dashboardMetrics = [
  {
    label: 'Total Patients',
    value: '1,248',
    detail: 'Active clinical profiles',
    change: '+8.4%',
    direction: 'up',
  },
  {
    label: 'Active Cohorts',
    value: '42',
    detail: 'Across 12 specialties',
    change: '+3 this month',
    direction: 'up',
  },
  {
    label: 'Treatment Success',
    value: '78.6%',
    detail: 'Across reviewed outcomes',
    change: '+5.2%',
    direction: 'up',
  },
  {
    label: 'Avg. Recovery',
    value: '12.4d',
    detail: 'For monitored cohorts',
    change: '-1.8 days',
    direction: 'down',
  },
] satisfies DashboardMetric[]
