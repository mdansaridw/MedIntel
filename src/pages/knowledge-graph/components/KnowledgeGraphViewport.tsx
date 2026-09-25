import { useEffect, useRef, useState, useCallback } from 'react'
import type { ClinicalGraphEdge, ClinicalGraphNode } from '../../../types/graph'
import { InspectorDrawer } from '../../../components/ui/InspectorDrawer'
import { Maximize2, Activity } from 'lucide-react'

interface KnowledgeGraphViewportProps {
  nodes: ClinicalGraphNode[]
  edges: ClinicalGraphEdge[]
}

const getThemeVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || fallback
}

export function KnowledgeGraphViewport({ nodes, edges }: KnowledgeGraphViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)
  
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'node'|'edge', data: any } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleRecenter = useCallback(() => {
    if (networkRef.current) {
      try {
        networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
      } catch (err) {
        console.warn('Network fit error:', err)
      }
    }
  }, [])

  useEffect(() => {
    let disposed = false
    let destroyNetwork: () => void = () => undefined

    const themeCanvas = getThemeVar('--canvas', '#151515')
    const themeInk = getThemeVar('--ink', '#edefec')
    
    // Node Color Palette (Obsidian Style with strong contrast)
    const nodeColors: Record<string, any> = {
      patient: { bg: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)' },
      disease: { bg: '#f87171', glow: 'rgba(248, 113, 113, 0.45)' },
      medication: { bg: '#34d399', glow: 'rgba(52, 211, 153, 0.45)' },
      allergy: { bg: '#a78bfa', glow: 'rgba(167, 139, 250, 0.45)' },
      supply: { bg: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.45)' },
      inventory: { bg: '#fbbf24', glow: 'rgba(251, 191, 36, 0.45)' },
      default: { bg: '#94a3b8', glow: 'rgba(148, 163, 184, 0.45)' }
    }

    setIsLoading(true)

    // Using vis-network/standalone which exports both Network and DataSet properly
    void import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (disposed || !containerRef.current) return

      if (nodes.length === 0) {
        setIsLoading(false)
        return
      }

      const nodesData = new DataSet(
        nodes.map((node) => {
          const colors = nodeColors[node.group] || nodeColors.default
          return {
            id: node.id,
            label: node.label,
            title: node.title || node.label,
            group: node.group,
            properties: (node as any).properties,
            shape: 'dot',
            size: node.group === 'patient' ? 26 : 15,
            color: {
              background: colors.bg,
              border: '#ffffff',
              highlight: { background: '#ffffff', border: colors.bg },
            },
            borderWidth: 2,
            shadow: { enabled: true, color: colors.glow, size: 14, x: 0, y: 0 },
            font: { color: themeInk, face: 'Inter Variable', size: 12, strokeWidth: 3, strokeColor: themeCanvas },
            hiddenLabel: node.label
          }
        })
      )

      const edgesData = new DataSet(
        edges.map((edge) => {
          const isSalad = edge.relationship === 'SOUNDS_ALIKE_TO'
          return {
            id: edge.id,
            from: edge.from,
            to: edge.to,
            label: edge.label,
            relationship: edge.relationship,
            properties: (edge as any).properties,
            color: isSalad 
              ? { color: '#f59e0b', highlight: '#ffffff' }
              : { color: '#64748b', opacity: 0.8 },
            dashes: isSalad ? [6, 4] : false,
            width: isSalad ? 3.0 : 1.8,
            shadow: isSalad ? { enabled: true, color: 'rgba(245, 158, 11, 0.6)', size: 12 } : false,
            smooth: { enabled: true, type: 'continuous', roundness: 0.2 },
            font: { align: 'middle', size: 10, color: themeInk, strokeWidth: 2, strokeColor: themeCanvas },
            hiddenLabel: edge.label
          }
        })
      )

      const network = new Network(
        containerRef.current,
        { nodes: nodesData, edges: edgesData },
        {
          autoResize: true,
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 110, springConstant: 0.08, damping: 0.4 },
            stabilization: { iterations: 120, updateInterval: 25 },
          },
          interaction: { hover: true, multiselect: false, tooltipDelay: 200, hideEdgesOnDrag: true },
        }
      )
      networkRef.current = network
      setIsLoading(false)

      // Ensure camera centers on nodes upon stabilization
      network.once('stabilizationIterationsDone', () => {
        network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
      })
      setTimeout(() => {
        try { network.fit() } catch (_) {}
      }, 300)
      setTimeout(() => {
        try { network.fit() } catch (_) {}
      }, 800)

      // 1. Zoom Level of Detail (LOD)
      network.on('zoom', (params) => {
        const scale = params.scale
        
        // Hide edges when zoomed out < 0.8
        const showEdgeLabels = scale > 0.8
        const edgesUpdate = edgesData.get().map((e: any) => ({
          id: e.id,
          label: showEdgeLabels ? e.hiddenLabel : ''
        }))
        edgesData.update(edgesUpdate)

        // Hide non-patient node labels when zoomed out < 0.6
        const showNodeLabels = scale > 0.6
        const nodesUpdate = nodesData.get().map((n: any) => ({
          id: n.id,
          label: (showNodeLabels || n.group === 'patient') ? n.hiddenLabel : ''
        }))
        nodesData.update(nodesUpdate)
      })

      // 2. Obsidian Focus Mode & Inspector Drawer
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const nodeData = nodesData.get(nodeId)
          setSelectedEntity({ type: 'node', data: nodeData })

          // Dim unrelated nodes
          const connectedNodes = network.getConnectedNodes(nodeId) as string[]
          const allNodes = nodesData.get()
          const dimUpdates = allNodes.map((n: any) => ({
            id: n.id,
            opacity: (n.id === nodeId || connectedNodes.includes(n.id)) ? 1.0 : 0.15
          }))
          ;(nodesData as any).update(dimUpdates)

        } else if (params.edges.length > 0) {
          const edgeId = params.edges[0]
          const edgeData = edgesData.get(edgeId)
          setSelectedEntity({ type: 'edge', data: edgeData })
        } else {
          // Clicked empty canvas
          setSelectedEntity(null)
          // Restore full brightness
          const allNodes = nodesData.get()
          const restoreUpdates = allNodes.map((n: any) => ({
            id: n.id,
            opacity: 1.0
          }))
          ;(nodesData as any).update(restoreUpdates)
        }
      })

      destroyNetwork = () => network.destroy()
    })

    return () => {
      disposed = true
      destroyNetwork()
    }
  }, [edges, nodes])

  return (
    <div className="relative w-full h-full min-h-[380px] bg-[#0f1218] rounded-xl overflow-hidden shadow-inner">
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%', minHeight: '380px' }}
        className="w-full h-full" 
        aria-label="Clinical knowledge graph" 
      />

      {/* Floating Fit Graph Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleRecenter}
          title="Recenter & Fit View"
          className="flex items-center gap-1.5 rounded-lg bg-[#1e232d]/90 backdrop-blur-sm border border-[#333d4d] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:border-accent hover:text-accent transition-all"
        >
          <Maximize2 className="size-3.5" />
          <span>Fit Graph</span>
        </button>
      </div>

      {(nodes.length === 0 || isLoading) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-ink-muted bg-surface/80 backdrop-blur-xs">
          <Activity className="size-6 text-accent mb-2 animate-pulse" />
          <span>Connecting to Neo4j Aura & extracting 2-hop clinical subgraph...</span>
        </div>
      )}

      <InspectorDrawer 
        isOpen={!!selectedEntity} 
        onClose={() => {
          setSelectedEntity(null)
          // Also restore node brightness when closing drawer
          if (networkRef.current) {
             networkRef.current.unselectAll()
             const nodesData = (networkRef.current as any).body?.data?.nodes
             if (nodesData) {
                 const allNodes = nodesData.get()
                 nodesData.update(allNodes.map((n: any) => ({ id: n.id, opacity: 1.0 })))
             }
          }
        }} 
        data={selectedEntity?.data} 
        type={selectedEntity?.type ?? null} 
      />
    </div>
  )
}
