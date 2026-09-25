import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface SidebarLinkProps {
  to: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  onNavigate: () => void
}

export function SidebarLink({ to, label, icon: Icon, collapsed, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-11 items-center rounded-2xl text-sm font-semibold tracking-[-0.05em] transition-colors duration-200',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
          isActive
            ? 'bg-accent text-[#151515] shadow-[0_8px_20px_rgba(87,154,217,0.22)]'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        )
      }
    >
      <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
    </NavLink>
  )
}
