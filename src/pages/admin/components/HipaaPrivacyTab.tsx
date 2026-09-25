import { useState } from 'react'
import {
  Download,
  FileCheck,
  Filter,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import type { AuditLogItem } from '../types'

interface Props {
  logs: AuditLogItem[]
}

export function HipaaPrivacyTab({ logs }: Props) {
  const [filterType, setFilterType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = logs.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType
    const matchesSearch =
      searchQuery === '' ||
      item.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.justification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_label.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const exportAuditLogJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `medintel_hipaa_audit_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6">
      {/* 1. Two-Vault Privacy Engine Architectural Explainer */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4.5 text-[#34d399]" />
            <div>
              <h3 className="text-sm font-bold text-ink">HIPAA Two-Vault Security Architecture</h3>
              <p className="text-xs text-ink-muted">Cryptographic separation between direct PII and clinical knowledge</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f2824] border border-[#1b4d3a] text-[#34d399] text-xs font-semibold">
            <FileCheck className="size-3.5" />
            <span>HIPAA Safe Harbor §164.514 Verified</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Vault 1 Card */}
          <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink flex items-center gap-1.5 text-xs">
                <Lock className="size-3.5 text-[#f59e0b]" />
                Vault 1: Identity Tokenizer (Encrypted SQLite)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#3b2b1d] text-[#f59e0b] text-[10px] font-bold">
                AES-256 Fernet
              </span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Stores only direct patient identifiers (First Name, Last Name, SSN, Address, Phone, Zip).
              Encrypted at rest using a dedicated symmetric cipher key stored strictly in memory and isolated from the graph.
            </p>
            <div className="pt-2 border-t border-line text-[11px] text-ink-muted">
              Access Rule: <strong className="text-ink">Break-Glass Protocol Only with Clinical Justification</strong>
            </div>
          </div>

          {/* Vault 2 Card */}
          <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink flex items-center gap-1.5 text-xs">
                <ShieldCheck className="size-3.5 text-[#34d399]" />
                Vault 2: Clinical Graph (Neo4j Aura Cloud)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0f2824] text-[#34d399] text-[10px] font-bold">
                Zero Direct PII
              </span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Stores only de-identified clinical phenotypes: anonymous UUID, birth year, gender, conditions,
              prescriptions, and vital biomarkers. External LLMs query strictly against this de-identified tier.
            </p>
            <div className="pt-2 border-t border-line text-[11px] text-ink-muted">
              Access Rule: <strong className="text-ink">Full Graph Analytics, Twin Matching & GraphRAG</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Break-Glass Emergency Decryption & Security Audit Log */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line p-5 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4.5 text-[#f59e0b]" />
            <div>
              <h3 className="text-sm font-bold text-ink">Emergency Access & Break-Glass Audit Trail</h3>
              <p className="text-xs text-ink-muted">Immutable forensic record of emergency decryptions and wire guard scrubbings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportAuditLogJson}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent transition-colors"
            >
              <Download className="size-3.5" />
              <span>Export Audit JSON</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-line bg-surface text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="size-3.5 text-ink-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by clinician, justification, or patient..."
              className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-ink-muted" />
            <span className="text-ink-muted">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-hidden"
            >
              <option value="ALL">All Event Types</option>
              <option value="BREAK_GLASS">Break-Glass Decryption</option>
              <option value="WIRE_GUARD">Wire Guard Scrubbing</option>
              <option value="SALAD_ALERT">SALAD Alert</option>
              <option value="FDA_RECALL">FDA Recall</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted/50 text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Clinician / Actor</th>
                <th className="px-4 py-3">Target Patient</th>
                <th className="px-4 py-3">Clinical Justification</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredLogs.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-ink-muted whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        item.type === 'BREAK_GLASS'
                          ? 'bg-[#3b2b1d] text-[#f59e0b]'
                          : item.type === 'WIRE_GUARD'
                          ? 'bg-[#0f2824] text-[#34d399]'
                          : item.type === 'FDA_RECALL'
                          ? 'bg-[#3b1d1d] text-[#f87171]'
                          : 'bg-[#2e2640] text-[#c084fc]'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink block">{item.actor}</span>
                    <span className="text-[10px] text-ink-muted">{item.role}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-accent font-medium">
                    {item.patient_label}
                  </td>
                  <td className="px-4 py-3 text-ink-muted max-w-xs">
                    <span className="block truncate" title={item.justification}>
                      {item.justification}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[#34d399] font-medium text-[11px]">
                      <UserCheck className="size-3" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
