import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { KnowledgeGraphViewport } from './components/KnowledgeGraphViewport'
import { MedIntelApi } from '../../services/api'
import { Network } from 'lucide-react'

export default function KnowledgeGraphPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)

  // 1. Fetch patients for dropdown
  useEffect(() => {
    MedIntelApi.getPatients(50).then((data) => {
      setPatients(data)
      if (data.length > 0) {
        setSelectedPatientId(data[0].id)
      }
    }).catch(console.error)
  }, [])

  // 2. Fetch subgraph when patient changes
  useEffect(() => {
    if (!selectedPatientId) return
    setLoading(true)
    MedIntelApi.getPatientSubgraph(selectedPatientId).then((data) => {
      setGraphData(data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedPatientId])

  return (
    <>
      <PageHeader
        eyebrow="Explorer"
        title="Knowledge Graph"
        description="Interactive visualization of the Neo4j clinical subgraph."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <Network aria-hidden="true" className="size-4 text-accent-strong" />
            {graphData.nodes.length} Nodes / {graphData.edges.length} Edges
          </span>
        }
      />
      <div className="flex flex-col h-[calc(100vh-10rem)] p-4 pt-0 gap-4">
        {/* Graph Controls HUD */}
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-line bg-surface-raised shadow-card">
          <label className="text-sm font-semibold text-ink">Target Patient Focus:</label>
          <select 
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                Patient {p.id.substring(0,8)}... (Age: {2026 - p.birth_year})
              </option>
            ))}
          </select>
          {loading && <span className="text-sm text-accent animate-pulse ml-2">Querying Neo4j...</span>}
        </div>

        {/* Viewport */}
        <div className="flex-1 rounded-2xl border border-line overflow-hidden shadow-card relative">
          <KnowledgeGraphViewport nodes={graphData.nodes} edges={graphData.edges} />
        </div>
      </div>
    </>
  )
}
