import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SidebarLink } from './SidebarLink'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
}

interface SidebarSectionProps {
  label: string
  items: NavigationItem[]
  collapsed: boolean
  onNavigate: () => void
}

export function SidebarSection({ label, items, collapsed, onNavigate }: SidebarSectionProps) {
  return (
    <section className="space-y-1.5">
      <h2
        className={cn(
          'px-3 pb-1 text-[10px] font-bold uppercase tracking-[-0.05em] text-ink-muted',
          collapsed && 'sr-only',
        )}
      >
        {label}
      </h2>
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarLink
            key={item.to}
            {...item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  )
}
