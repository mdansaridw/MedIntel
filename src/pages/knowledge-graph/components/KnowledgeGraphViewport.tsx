import { useEffect, useRef, useState } from 'react'
import type { ClinicalGraphEdge, ClinicalGraphNode } from '../../../types/graph'
import { InspectorDrawer } from '../../../components/ui/InspectorDrawer'

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

  useEffect(() => {
    let disposed = false
    let destroyNetwork: () => void = () => undefined

    const themeCanvas = getThemeVar('--canvas', '#151515')
    const themeInk = getThemeVar('--ink', '#edefec')
    
    // Node Color Palette (Obsidian Style)
    const nodeColors: Record<string, any> = {
      patient: { bg: getThemeVar('--accent', '#38BDF8'), glow: 'rgba(56, 189, 248, 0.4)' },
      disease: { bg: getThemeVar('--danger', '#F87171'), glow: 'rgba(248, 113, 113, 0.4)' },
      medication: { bg: getThemeVar('--success', '#34D399'), glow: 'rgba(52, 211, 153, 0.4)' },
      allergy: { bg: '#a78bfa', glow: 'rgba(167, 139, 250, 0.4)' },
      supply: { bg: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.4)' },
      inventory: { bg: getThemeVar('--warning', '#d3a465'), glow: 'rgba(211, 164, 101, 0.4)' },
      default: { bg: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
    }

    void import('vis-network').then(({ Network, DataSet }) => {
      if (disposed || !containerRef.current) return

      const nodesData = new DataSet(
        nodes.map((node) => {
          const colors = nodeColors[node.group] || nodeColors.default
          return {
            id: node.id,
            label: node.label,
            title: node.title,
            group: node.group,
            properties: (node as any).properties,
            shape: 'dot',
            size: node.group === 'patient' ? 24 : 14,
            color: {
              background: colors.bg,
              border: colors.bg,
              highlight: { background: '#ffffff', border: colors.bg },
            },
            shadow: { enabled: true, color: colors.glow, size: 15, x: 0, y: 0 },
            font: { color: themeInk, face: 'Inter Variable', size: 12, strokeWidth: 3, strokeColor: themeCanvas },
            hiddenLabel: node.label // Store to toggle via LOD
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
              ? { color: getThemeVar('--warning', '#d3a465'), highlight: '#ffffff' }
              : { color: getThemeVar('--border', '#373936'), opacity: 0.65 },
            dashes: isSalad ? [6, 4] : false,
            width: isSalad ? 2.8 : 1.5,
            shadow: isSalad ? { enabled: true, color: 'rgba(211,164,101,0.6)', size: 10 } : false,
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
            forceAtlas2Based: { gravitationalConstant: -40, centralGravity: 0.005, springLength: 120, springConstant: 0.08, damping: 0.4 },
            stabilization: { iterations: 150 },
          },
          interaction: { hover: true, multiselect: false, tooltipDelay: 200, hideEdgesOnDrag: true },
        }
      )
      networkRef.current = network

      // Ensure camera centers on nodes upon stabilization
      network.once('stabilizationIterationsDone', () => {
        network.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } })
      })
      setTimeout(() => {
        try { network.fit() } catch (_) {}
      }, 500)

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
    <div className="relative size-full min-h-[380px] overflow-hidden">
      <div ref={containerRef} className="size-full min-h-[380px]" aria-label="Clinical knowledge graph" />
      <InspectorDrawer 
        isOpen={!!selectedEntity} 
        onClose={() => {
          setSelectedEntity(null)
          // Also restore node brightness when closing drawer
          if (networkRef.current) {
             networkRef.current.unselectAll()
             const nodesData = (networkRef.current as any).body.data.nodes
             if (nodesData) {
                 const allNodes = nodesData.get()
                 nodesData.update(allNodes.map((n: any) => ({ id: n.id, color: { opacity: 1.0 } })))
             }
          }
        }} 
        data={selectedEntity?.data} 
        type={selectedEntity?.type ?? null} 
      />
    </div>
  )
}
