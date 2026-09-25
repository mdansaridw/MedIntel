import { useEffect, useState } from 'react'
import { UsersRound, Activity } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { PatientCard } from './components/PatientCard'
import { MedIntelApi } from '../../services/api'

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    MedIntelApi.getPatients(30).then((data) => {
      setPatients(data)
      setLoading(false)
    }).catch(console.error)
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')

  const filteredPatients = patients.filter((p) => {
    const matchesId = p.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCond = p.conditions?.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase()))
    const targetGender = genderFilter === 'male' ? 'M' : genderFilter === 'female' ? 'F' : 'ALL'
    const matchesGender = targetGender === 'ALL' || p.gender?.toUpperCase() === targetGender
    return (matchesId || matchesCond) && matchesGender
  })

  return (
    <>
      <PageHeader
        eyebrow="Sectors"
        title="Patient Directory"
        description="Live Neo4j Graph Data. PII is secured in Vault 1."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <UsersRound aria-hidden="true" className="size-4 text-accent-strong" />
            {filteredPatients.length} / {patients.length} records
          </span>
        }
      />
      <PageContainer className="flex flex-col gap-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised p-4 shadow-card">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <input 
              type="text"
              placeholder="Search by Patient ID (e.g. cc3e...) or Condition (e.g. Diabetes)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Gender:</span>
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {(['all', 'male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    genderFilter === g
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 gap-3 text-accent">
            <Activity className="size-5 animate-pulse" />
            <span className="text-sm font-medium">Querying Vault 2 (Neo4j Clinical Graph)...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-ink-muted">
            No patients match the current search query or filter.
          </div>
        ) : (
          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Patient directory"
          >
            {filteredPatients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </section>
        )}
      </PageContainer>
    </>
  )
}
