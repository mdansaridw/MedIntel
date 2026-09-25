import { ShieldCheck, UserRound, ArrowRight, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'

export function PatientCard({ patient }: { patient: any }) {
  const age = 2026 - (patient.birth_year || 1980)
  const isNonClinical = (name: string) => {
    const lower = name.toLowerCase()
    return lower.includes('education') || 
           lower.includes('employment') || 
           lower.includes('social') || 
           lower.includes('violence') || 
           lower.includes('abuse') || 
           lower.includes('situation') ||
           lower.includes('labor force')
  }
  const clinicalConditions = (patient.conditions || []).filter((c: string) => !isNonClinical(c))

  return (
    <Card className="flex min-h-64 flex-col p-5 hover:border-accent transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <UserRound aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-ink">
              Patient #{patient.id.substring(0, 8)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="size-3 text-success" />
              <span className="text-[11px] font-medium text-ink-muted">Vault 1 Protected</span>
            </div>
          </div>
        </div>
        <StatusBadge intent="default" size="sm">
          {patient.gender === 'M' ? 'MALE' : patient.gender === 'F' ? 'FEMALE' : 'ANONYMOUS'}
        </StatusBadge>
      </div>

      {/* Demographics Pill Bar */}
      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-muted">
        <span>{age} yrs</span>
        <span className="size-1 rounded-full bg-ink-muted" />
        <span>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
        <span className="size-1 rounded-full bg-ink-muted" />
        <span className="capitalize">{patient.race || 'Unknown'}</span>
        <span className="size-1 rounded-full bg-ink-muted" />
        <span className="font-semibold text-ink">{clinicalConditions.length} Diagnoses</span>
      </div>

      {/* Condition Badges (NO biomarkers, only clinical conditions) */}
      <div className="mt-4 flex flex-wrap gap-1.5 min-h-12">
        {clinicalConditions.slice(0, 3).map((cond: string, idx: number) => (
          <span
            key={idx}
            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted line-clamp-1 max-w-[200px]"
            title={cond}
          >
            {cond}
          </span>
        ))}
        {clinicalConditions.length > 3 && (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
            +{clinicalConditions.length - 3} more
          </span>
        )}
        {clinicalConditions.length === 0 && (
          <span className="text-xs text-ink-muted italic">No active chronic conditions logged</span>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="mt-auto pt-4 border-t border-line">
        <Link 
          to={`/patients/${patient.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-raised border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-accent hover:text-white hover:border-accent transition-all shadow-sm group"
        >
          <Stethoscope className="size-3.5 text-accent group-hover:text-white transition-colors" />
          <span>Check Patient</span>
          <ArrowRight className="size-3.5 ml-auto text-ink-muted group-hover:text-white transition-colors" />
        </Link>
      </div>
    </Card>
  )
}
