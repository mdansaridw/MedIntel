import { X } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface InspectorDrawerProps {
  isOpen: boolean
  onClose: () => void
  data: any
  type: 'node' | 'edge' | null
}

export function InspectorDrawer({ isOpen, onClose, data, type }: InspectorDrawerProps) {
  if (!isOpen || !data) return null

  // Determine badge color based on group or relationship
  let badgeIntent: "default" | "success" | "danger" | "warning" | "accent" = "default"
  let badgeLabel = data.group || data.relationship || 'Details'

  if (type === 'node') {
    if (data.group === 'patient') badgeIntent = 'accent'
    if (data.group === 'disease') badgeIntent = 'danger'
    if (data.group === 'medication') badgeIntent = 'success'
    if (data.group === 'allergy') badgeIntent = 'default'
    if (data.group === 'supply' || data.group === 'inventory') badgeIntent = 'warning'
  } else if (type === 'edge') {
    if (data.relationship === 'SOUNDS_ALIKE_TO') badgeIntent = 'warning'
    if (data.relationship === 'TREATS') badgeIntent = 'success'
    if (data.relationship === 'DIAGNOSED_WITH') badgeIntent = 'danger'
  }

  const isSalad = type === 'edge' && data.relationship === 'SOUNDS_ALIKE_TO'

  return (
    <div className="absolute top-4 right-4 z-50 w-80 rounded-2xl border border-line bg-surface/95 backdrop-blur-xl shadow-float p-5 transition-transform animate-in slide-in-from-right-8">
      <div className="flex items-center justify-between mb-4">
        <StatusBadge intent={badgeIntent} size="sm">
          {badgeLabel.toUpperCase()}
        </StatusBadge>
        <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
          <X className="size-5" />
        </button>
      </div>

      <h3 className="text-lg font-display font-semibold text-ink mb-4">
        {data.label || 'Entity Details'}
      </h3>

      {isSalad && (
        <div className="mb-4 rounded-xl border border-warning bg-warning-soft p-3">
          <p className="text-sm font-semibold text-warning mb-1">⚠️ SALAD Warning</p>
          <p className="text-xs text-ink-muted">
            High risk of auditory dispensing confusion. Phonetic collision detected (Double Metaphone).
          </p>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(data.properties || {}).map(([key, value]) => {
          if (key === 'id' || key === 'name' || value === null || value === '') return null
          return (
            <div key={key} className="flex flex-col">
              <span className="text-xs text-ink-muted uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
              <span className="text-sm font-medium text-ink">{String(value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
