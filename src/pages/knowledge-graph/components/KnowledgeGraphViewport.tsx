import { useEffect, useRef } from 'react'
import type { ClinicalGraphEdge, ClinicalGraphNode } from '../../../types/graph'

interface KnowledgeGraphViewportProps {
  nodes: ClinicalGraphNode[]
  edges: ClinicalGraphEdge[]
}

const nodeColors: Record<ClinicalGraphNode['group'], string> = {
  patient: '#579AD9',
  disease: '#B75D5D',
  medication: '#5F8D72',
  lab: '#B7833F',
  consultation: '#7667C7',
  doctor: '#4B8E83',
}

export function KnowledgeGraphViewport({ nodes, edges }: KnowledgeGraphViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let destroyNetwork: () => void = () => undefined

    void import('vis-network').then(({ Network }) => {
      if (disposed || !containerRef.current) return

      const network = new Network(
        containerRef.current,
        {
          nodes: nodes.map((node) => ({
            id: node.id,
            label: node.label,
            title: node.title,
            shape: 'dot',
            size: node.group === 'patient' ? 18 : 13,
            color: {
              background: nodeColors[node.group],
              border: '#EDEFEC',
              highlight: {
                background: nodeColors[node.group],
                border: '#151515',
              },
            },
            font: {
              color: '#EDEFEC',
              face: 'Inter Variable',
              size: 12,
            },
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            from: edge.from,
            to: edge.to,
            label: edge.label,
            title: edge.relationship,
            color: { color: '#737873', opacity: 0.65 },
            smooth: { enabled: true, type: 'continuous', roundness: 0.2 },
          })),
        },
        {
          autoResize: true,
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -54, springLength: 145 },
            stabilization: { iterations: 180 },
          },
          interaction: { hover: true, multiselect: true, navigationButtons: true, tooltipDelay: 120 },
        },
      )

      destroyNetwork = () => network.destroy()
    })

    return () => {
      disposed = true
      destroyNetwork()
    }
  }, [edges, nodes])

  return <div ref={containerRef} className="size-full" aria-label="Clinical knowledge graph" />
}
