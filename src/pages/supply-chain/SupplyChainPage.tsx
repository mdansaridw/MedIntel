import { useState } from 'react'
import { AlertOctagon, Box, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { MedIntelApi } from '../../services/api'

export default function SupplyChainPage() {
  const [lotNumber, setLotNumber] = useState('LOT-2026-MED-1535362')
  const [loading, setLoading] = useState(false)
  const [recallData, setRecallData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MedIntelApi.checkFdaRecall(lotNumber)
      if (data.status === 'Not Found') {
        setError(data.message)
        setRecallData(null)
      } else {
        setRecallData(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Supply Chain & FDA Recalls"
        description="Live tracing between Neo4j (Vault 2) and the Encrypted Identity Vault (Vault 1)."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <Box aria-hidden="true" className="size-4 text-accent-strong" />
            Inventory Engine Live
          </span>
        }
      />
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Card */}
          <div className="rounded-2xl border border-line bg-surface-raised p-6 shadow-card col-span-1">
            <h2 className="text-lg font-display font-semibold text-ink mb-4">FDA Batch Recall Audit</h2>
            <p className="text-sm text-ink-muted mb-4">
              Enter a compromised lot number to instantly quarantine remaining stock and decrypt affected patient emergency contacts.
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                placeholder="e.g. LOT-2026-MED-..."
              />
              <button 
                onClick={handleSearch}
                disabled={loading || !lotNumber}
                className="flex items-center justify-center rounded-xl bg-danger px-4 text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {loading ? 'Searching...' : <Search className="size-4" />}
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          </div>

          {/* Results Card */}
          {recallData && (
            <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 shadow-card col-span-2">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <AlertOctagon className="size-6 text-danger" />
                    <h2 className="text-2xl font-display font-semibold text-ink">Recall Activated</h2>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Found compromised item: <strong className="text-ink">{recallData.item_name}</strong>
                  </p>
                </div>
                <StatusBadge intent="danger" size="lg">CRITICAL</StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-xl border border-danger/20 bg-surface/50 p-4">
                  <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Stock to Destroy</p>
                  <p className="text-2xl font-semibold text-danger">{recallData.remaining_stock_to_destroy} units</p>
                </div>
                <div className="rounded-xl border border-danger/20 bg-surface/50 p-4">
                  <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Affected Patients</p>
                  <p className="text-2xl font-semibold text-danger">{recallData.total_affected_patients} records</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4 border-b border-line pb-2">
                Decrypted Emergency Contacts (Vault 1)
              </h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {recallData.emergency_contact_list.map((contact: any, i: number) => (
                  <div key={i} className="flex justify-between items-center rounded-xl bg-surface p-3 border border-line">
                    <div>
                      <p className="text-sm font-semibold text-ink">{contact.name}</p>
                      <p className="text-xs text-ink-muted">{contact.address}</p>
                    </div>
                    <span className="text-xs font-mono bg-surface-muted px-2 py-1 rounded text-ink">{contact.patient_id.substring(0,8)}...</span>
                  </div>
                ))}
                {recallData.emergency_contact_list.length === 0 && (
                  <p className="text-sm text-ink-muted">No patient contacts found in Identity Vault.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}
