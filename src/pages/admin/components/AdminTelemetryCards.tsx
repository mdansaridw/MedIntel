import { Activity, Database, Lock, ShieldCheck } from 'lucide-react'
import type { AdminCounts, AdminTelemetry } from '../types'

interface Props {
  counts: AdminCounts
  telemetry: AdminTelemetry
  isLoading: boolean
}

export function AdminTelemetryCards({ counts, telemetry, isLoading }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. HIPAA Safe Harbor */}
      <div className="rounded-2xl border border-line bg-surface p-4.5 shadow-card transition-all hover:border-accent/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            HIPAA Governance
          </span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#0f2824] text-[#34d399]">
            <ShieldCheck className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#34d399]">
            {isLoading ? '...' : telemetry.compliance.hipaa_safe_harbor}
          </span>
          <span className="text-xs text-ink-muted">Two-Vault Separation</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="size-1.5 rounded-full bg-[#34d399]" />
          <span>Direct PII in Graph: <strong>0 attributes</strong></span>
        </div>
      </div>

      {/* 2. Neo4j Aura Database */}
      <div className="rounded-2xl border border-line bg-surface p-4.5 shadow-card transition-all hover:border-accent/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Neo4j Aura Cloud
          </span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
            <Database className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink">
            {isLoading ? '...' : telemetry.neo4j.status}
          </span>
          <span className="text-xs text-accent font-medium">
            {telemetry.neo4j.latency_ms} ms
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="size-1.5 rounded-full bg-[#34d399]" />
          <span>Transit: <strong>TLS neo4j+ssc</strong></span>
        </div>
      </div>

      {/* 3. Knowledge Graph Scale */}
      <div className="rounded-2xl border border-line bg-surface p-4.5 shadow-card transition-all hover:border-accent/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Graph Knowledge Scale
          </span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#2e2640] text-[#c084fc]">
            <Activity className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink">
            {isLoading ? '...' : counts.total_nodes.toLocaleString()}
          </span>
          <span className="text-xs text-ink-muted">Nodes</span>
        </div>
        <div className="mt-2 text-xs text-ink-muted truncate">
          <span>{counts.patients} Patients • {counts.conditions} Conditions • {counts.medications} Meds</span>
        </div>
      </div>

      {/* 4. Client Wire Guard & Vault 1 */}
      <div className="rounded-2xl border border-line bg-surface p-4.5 shadow-card transition-all hover:border-accent/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Security Interceptor
          </span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#3b2b1d] text-[#f59e0b]">
            <Lock className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink">
            Enforced
          </span>
          <span className="text-xs text-[#f59e0b] font-medium">AES-256</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="size-1.5 rounded-full bg-[#34d399]" />
          <span>Client Zero-PII Pre-Flight Active</span>
        </div>
      </div>
    </div>
  )
}
