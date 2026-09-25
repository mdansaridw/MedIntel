import { useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Info,
  Layers,
  Pill,
  ShieldAlert,
  Sliders,
  Users,
} from 'lucide-react'
import type { SaladRuleItem } from '../types'

interface Props {
  saladRules: SaladRuleItem[]
  onQuarantineToggle: (lotNumber: string) => Promise<void>
  isQuarantined: boolean
  impactedPatients: number
}

export function DrugSafetyTab({
  saladRules,
  onQuarantineToggle,
  isQuarantined,
  impactedPatients,
}: Props) {
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75)
  const [quarantining, setQuarantining] = useState(false)
  const [rules, setRules] = useState<SaladRuleItem[]>(saladRules)

  const handleToggleRuleStatus = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const newStatus = r.status === 'Active Warning' ? 'Whitelisted' : 'Active Warning'
          return { ...r, status: newStatus }
        }
        return r
      })
    )
  }

  const handleQuarantine = async () => {
    setQuarantining(true)
    try {
      await onQuarantineToggle('RECALL-2024-001')
    } finally {
      setQuarantining(false)
    }
  }

  const filteredRules = rules.filter((r) => r.similarity_score >= similarityThreshold)

  return (
    <div className="space-y-6">
      {/* 1. FDA Batch Recall Quarantine Center */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4.5 text-[#f87171]" />
            <div>
              <h3 className="text-sm font-bold text-ink">FDA Batch Recall & Supply Chain Quarantine</h3>
              <p className="text-xs text-ink-muted">1-Hop graph analysis of contaminated drug lots and real-time dispensing blocks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isQuarantined
                  ? 'bg-[#3b1d1d] border border-[#5c2424] text-[#f87171]'
                  : 'bg-[#0f2824] border border-[#1b4d3a] text-[#34d399]'
              }`}
            >
              {isQuarantined ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
              <span>{isQuarantined ? 'Quarantine Enforced' : 'Active / Dispensing'}</span>
            </span>
          </div>
        </div>

        {/* Recall Lot Details Card */}
        <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-ink">Lot #RECALL-2024-001</span>
                <span className="px-2 py-0.5 rounded bg-[#3b1d1d] text-[#f87171] text-[10px] font-bold">
                  FDA Class II Alert
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Metformin Hydrochloride Extended-Release Tablets 500mg • Reason: Trace NDMA impurity detection
              </p>
            </div>

            <button
              type="button"
              onClick={handleQuarantine}
              disabled={quarantining}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isQuarantined
                  ? 'bg-surface border border-line text-ink hover:border-accent'
                  : 'bg-[#b75d5d] text-white hover:bg-[#c96f6f]'
              }`}
            >
              {isQuarantined ? (
                <>
                  <CheckCircle className="size-4 text-[#34d399]" />
                  <span>Lift Quarantine</span>
                </>
              ) : (
                <>
                  <Ban className="size-4" />
                  <span>Quarantine Batch (Block Prescriptions)</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line text-xs">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-accent" />
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">1-Hop Patient Exposure</span>
                <strong className="text-ink text-sm">{impactedPatients} patients on active therapy</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[#f59e0b]" />
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">Hospital Shelf Stock</span>
                <strong className="text-ink text-sm">340 units quarantined in Vault 2</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Info className="size-4 text-accent" />
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">Clinical Alternative</span>
                <strong className="text-ink text-sm">Metformin 850mg (Lot #MET-OK-88)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SALAD (Sound-Alike Look-Alike Drugs) Phonetic Rule Engine */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line p-5 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <Pill className="size-4.5 text-[#f59e0b]" />
            <div>
              <h3 className="text-sm font-bold text-ink">SALAD Phonetic Collision & Confusion Matrix</h3>
              <p className="text-xs text-ink-muted">Double Metaphone phonetic matching + Levenshtein distance on formulary names</p>
            </div>
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3 bg-surface border border-line px-3 py-1.5 rounded-xl text-xs">
            <Sliders className="size-3.5 text-accent" />
            <span className="text-ink-muted">Clash Sensitivity:</span>
            <input
              type="range"
              min="0.60"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="accent-accent w-24 cursor-pointer"
            />
            <span className="font-mono font-bold text-accent">{similarityThreshold.toFixed(2)}</span>
          </div>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted/50 text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Conflicting Drug Pair</th>
                <th className="px-4 py-3">Clinical Indications</th>
                <th className="px-4 py-3">Phonetic Score</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Action Enforced</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>{rule.drug_a}</span>
                      <span className="text-ink-muted">⚡</span>
                      <span>{rule.drug_b}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted block">
                      ({rule.brand_a} vs {rule.brand_b})
                    </span>
                  </td>

                  <td className="px-4 py-3 text-ink-muted max-w-xs text-[11px]">
                    <span className="block font-medium text-ink">{rule.indication_a}</span>
                    <span className="block text-[10px] text-ink-muted">{rule.indication_b}</span>
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-ink">
                    <div className="flex items-center gap-1.5">
                      <span>{rule.similarity_score}</span>
                      <div className="w-12 bg-surface-muted h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-accent h-full"
                          style={{ width: `${rule.similarity_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rule.risk_level === 'CRITICAL'
                          ? 'bg-[#3b1d1d] text-[#f87171]'
                          : rule.risk_level === 'HIGH'
                          ? 'bg-[#3b2b1d] text-[#f59e0b]'
                          : 'bg-[#2e2640] text-[#c084fc]'
                      }`}
                    >
                      {rule.risk_level}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-ink font-medium text-[11px]">
                    {rule.action_required}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        rule.status === 'Active Warning' ? 'text-[#f59e0b]' : 'text-ink-muted'
                      }`}
                    >
                      {rule.status === 'Active Warning' && <AlertTriangle className="size-3" />}
                      <span>{rule.status}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleRuleStatus(rule.id)}
                      className="px-2.5 py-1 rounded-lg border border-line bg-surface text-[10.5px] font-medium text-ink hover:border-accent transition-colors"
                    >
                      {rule.status === 'Active Warning' ? 'Whitelist' : 'Activate'}
                    </button>
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
