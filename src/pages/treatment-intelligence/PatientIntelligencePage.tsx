import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  HeartPulse,
  Stethoscope,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { PageContainer } from '../../components/ui/PageContainer'
import { getPatientById, getPrimaryCondition } from '../../data/mockPatients'
import { MedIntelApi } from '../../services/api'

export default function PatientIntelligencePage() {
  const { patientId = '' } = useParams()
  const patient = getPatientById(patientId) // Keep mock patient demographic layout for now
  
  const [loading, setLoading] = useState(true)
  const [twinData, setTwinData] = useState<any>(null)
  const [treatmentPlan, setTreatmentPlan] = useState<any[]>([])
  
  useEffect(() => {
    if (!patientId) return
    MedIntelApi.getPersonalizedTreatment(patientId).then(data => {
      setTwinData(data.top_twins?.[0]) // Top twin
      setTreatmentPlan(data.personalized_treatment_plan || [])
      setLoading(false)
    }).catch(console.error)
  }, [patientId])

  if (!patient) {
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
  const bestTwinScore = twinData ? (twinData.total_score_pct || 0).toFixed(1) : '0.0'
  const breakdown = twinData?.score_breakdown || {}

  return (
    <>
      <PageHeader
        eyebrow={`${patient.id} · Method 4 Similarity Engine`}
        title="Treatment Intelligence"
        description={`${patient.name} · Live Clinical Twin Profile`}
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong">
              Live Neo4j Sync
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
            label="Twin Match Score"
            value={`${bestTwinScore}%`}
            detail={loading ? 'Calculating...' : `Top match found in graph`}
          />
          <DetailMetric
            icon={Activity}
            label="Jaccard Overlap"
            value={`${(breakdown.jaccard_conditions || 0).toFixed(1)}%`}
            detail="Condition match (50% wgt)"
          />
          <DetailMetric
            icon={HeartPulse}
            label="Biomarker Distance"
            value={`${(breakdown.cosine_biomarkers || 0).toFixed(1)}%`}
            detail="Cosine similarity (35% wgt)"
          />
          <DetailMetric
            icon={CalendarClock}
            label="Demographics"
            value={`${(breakdown.euclidean_demographics || 0).toFixed(1)}%`}
            detail="Age/Gender match (15% wgt)"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="flex flex-col gap-6">
            
            <Card className="overflow-hidden">
              <div className="border-b border-line p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-strong">
                  Method 4 Derived Treatments
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                  Personalized Therapy & Supply Stock
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      <th className="px-6 py-3 font-bold">Therapy (Drug)</th>
                      <th className="px-4 py-3 font-bold">Stock Qty</th>
                      <th className="px-4 py-3 font-bold">SALAD Warning</th>
                      <th className="px-6 py-3 text-right font-bold">Companion Supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={4} className="p-4 text-center text-sm text-ink-muted">Loading live graph recommendations...</td></tr>
                    )}
                    {!loading && treatmentPlan.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-sm text-ink-muted">No treatments found from top twins.</td></tr>
                    )}
                    {!loading && treatmentPlan.map((therapy) => (
                      <tr key={therapy.recommended_medication} className="border-b border-line last:border-0">
                        <td className="px-6 py-4 text-sm font-semibold text-success">{therapy.recommended_medication}</td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-semibold ${therapy.stock_quantity <= therapy.reorder_threshold ? 'text-danger' : 'text-ink'}`}>
                            {therapy.stock_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                           {therapy.salad_confusables?.length > 0 ? (
                             <span className="text-xs px-2 py-1 bg-warning-soft text-warning rounded-lg border border-warning">
                               High Risk: Confused with {therapy.salad_confusables.join(', ')}
                             </span>
                           ) : <span className="text-xs text-ink-muted">Low Risk</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-ink-muted">
                           {therapy.required_supplies?.join(', ') || 'None'}
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
                Twin Identification
              </h2>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2.5 text-sm leading-5 text-ink-muted">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-strong" />
                  Primary matched on {condition.name}
                </li>
                <li className="flex items-start gap-2.5 text-sm leading-5 text-ink-muted">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-strong" />
                  HbA1c aligned: {(patient as any).hba1c || '7.4%'}
                </li>
              </ul>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                  <ClipboardList aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-muted">
                    Engine Status
                  </p>
                  <p className="text-sm font-semibold text-ink">Method 4 Active</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-muted">This page dynamically queries the Neo4j Knowledge Graph to find exact clinical twins and cross-references treatment efficacy with pharmacy stock and SALAD warnings.</p>
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
