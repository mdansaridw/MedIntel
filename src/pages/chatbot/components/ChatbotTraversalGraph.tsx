import { useEffect, useRef, useState } from 'react'
import { Network as NetworkIcon, FileText, Terminal, Check, Copy, ChevronDown, ChevronUp, Activity, Cpu } from 'lucide-react'

interface TraversalNode {
  id: string
  label: string
  title: string
  group: string
}

interface TraversalEdge {
  id: string
  from: string
  to: string
  relationship: string
  label: string
}

export interface TraversalData {
  summary: string
  steps: string[]
  nodes: TraversalNode[]
  edges: TraversalEdge[]
}

interface ChatbotTraversalGraphProps {
  traversal: TraversalData | null
  cypher?: string
  metrics?: {
    nodes_visited: number
    edges_traversed: number
    latency_ms: number
  }
}

export function ChatbotTraversalGraph({ traversal, cypher, metrics }: ChatbotTraversalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)
  const [showCypher, setShowCypher] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSteps, setShowSteps] = useState(true)

  const copyCypher = () => {
    if (!cypher) return
    navigator.clipboard.writeText(cypher)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!traversal || !traversal.nodes || traversal.nodes.length === 0 || !containerRef.current) {
      return
    }

    let disposed = false
    let destroyNetwork: () => void = () => undefined

    const nodeColors: Record<string, any> = {
      patient: { bg: '#38BDF8', glow: 'rgba(56, 189, 248, 0.5)' },
      disease: { bg: '#F87171', glow: 'rgba(248, 113, 113, 0.5)' },
      medication: { bg: '#34D399', glow: 'rgba(52, 211, 153, 0.5)' },
      allergy: { bg: '#A78BFA', glow: 'rgba(167, 139, 250, 0.5)' },
      supply: { bg: '#2DD4BF', glow: 'rgba(45, 212, 191, 0.5)' },
      inventory: { bg: '#FBBF24', glow: 'rgba(251, 191, 36, 0.5)' },
      default: { bg: '#94A3B8', glow: 'rgba(148, 163, 184, 0.4)' },
    }

    void import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (disposed || !containerRef.current) return

      const visNodes = new DataSet(
        traversal.nodes.map((node) => {
          const colors = nodeColors[node.group] || nodeColors.default
          return {
            id: node.id,
            label: node.label,
            title: node.title,
            shape: 'dot',
            size: node.group === 'patient' ? 22 : 15,
            color: {
              background: colors.bg,
              border: colors.bg,
              highlight: { background: '#ffffff', border: colors.bg },
            },
            shadow: { enabled: true, color: colors.glow, size: 14, x: 0, y: 0 },
            font: { color: '#EDEFEC', face: 'Inter Variable', size: 11, strokeWidth: 3, strokeColor: '#151515' },
          }
        })
      )

      const visEdges = new DataSet(
        traversal.edges.map((edge) => {
          return {
            id: edge.id,
            from: edge.from,
            to: edge.to,
            label: edge.label,
            title: edge.relationship,
            color: { color: '#4B5563', highlight: '#38BDF8', opacity: 0.8 },
            width: 1.8,
            smooth: { enabled: true, type: 'continuous', roundness: 0.2 },
            font: { align: 'middle', size: 9, color: '#9CA3AF', strokeWidth: 2, strokeColor: '#151515' },
          }
        })
      )

      const network = new Network(
        containerRef.current,
        { nodes: visNodes, edges: visEdges },
        {
          autoResize: true,
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -35, springLength: 100, damping: 0.4 },
            stabilization: { iterations: 120 },
          },
          interaction: { hover: true, tooltipDelay: 150 },
        }
      )

      networkRef.current = network
      destroyNetwork = () => network.destroy()
    })

    return () => {
      disposed = true
      destroyNetwork()
    }
  }, [traversal])

  return (
    <div className="flex flex-col h-full rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-raised shrink-0">
        <div className="flex items-center gap-2.5">
          <NetworkIcon className="size-4 text-accent" />
          <h2 className="text-sm font-bold text-ink tracking-tight">
            Knowledge Graph Traversal
          </h2>
        </div>
        {metrics && (
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <Activity className="size-3 text-emerald-400" />
              {metrics.nodes_visited} nodes
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="size-3 text-accent" />
              {metrics.latency_ms}ms
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!traversal ? (
        // Empty State matching screenshot
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
          <div className="p-4 rounded-2xl bg-surface-muted/50 border border-line/50 mb-4 text-ink-muted">
            <FileText className="size-8 stroke-[1.4]" />
          </div>
          <p className="text-sm text-ink-muted max-w-xs font-normal">
            Ask a question to see the traversal path used to answer it.
          </p>
        </div>
      ) : (
        // Active Traversal View
        <div className="flex-1 flex flex-col min-h-0">
          {/* Interactive vis-network canvas */}
          <div className="relative h-64 sm:h-72 w-full bg-[#111418] border-b border-line">
            <div ref={containerRef} className="size-full" />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#151A22]/90 border border-line/60 text-[10px] text-ink-muted backdrop-blur-xs">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              Interactive Graph Canvas (Drag / Zoom)
            </div>
          </div>

          {/* Traversal Stepper & Cypher Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Traversal Steps */}
            {traversal.steps && traversal.steps.length > 0 && (
              <div className="rounded-xl border border-line bg-surface-raised p-3.5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowSteps(!showSteps)}
                  className="flex items-center justify-between w-full text-left text-xs font-bold uppercase tracking-wider text-ink-muted"
                >
                  <span>Traversal Path ({traversal.steps.length} Steps)</span>
                  {showSteps ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
                {showSteps && (
                  <ol className="space-y-2 text-xs text-ink">
                    {traversal.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Cypher Query Toggle */}
            {cypher && (
              <div className="rounded-xl border border-line bg-surface-raised p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCypher(!showCypher)}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                  >
                    <Terminal className="size-3.5 text-accent" />
                    <span>Cypher Query</span>
                    {showCypher ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyCypher}
                    className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent transition-colors"
                  >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                {showCypher && (
                  <pre className="p-3 rounded-lg bg-[#0B0F17] border border-line text-[11px] font-mono text-[#78B1E4] overflow-x-auto leading-relaxed">
                    {cypher}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
