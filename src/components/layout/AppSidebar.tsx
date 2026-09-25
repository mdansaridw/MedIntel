import {
  Activity,
  Dna,
  FlaskConical,
  House,
  LayoutDashboard,
  MessagesSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { useSidebar } from '../../hooks/useSidebar'
import { cn } from '../../lib/cn'
import { SidebarSection, type NavigationItem } from './SidebarSection'

const navigationItems: NavigationItem[] = [
  { label: 'Home', to: '/', icon: House },
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
]

const sectorItems: NavigationItem[] = [
  { label: 'Patients', to: '/patients', icon: UsersRound },
  { label: 'Cohorts', to: '/cohorts', icon: Dna },
]

const researchItems: NavigationItem[] = [
  { label: 'Treatment Intelligence', to: '/treatment-intelligence', icon: FlaskConical },
  { label: 'Knowledge Graph', to: '/knowledge-graph', icon: Network },
  { label: 'Admin Panel', to: '/admin', icon: ShieldCheck },
  { label: 'Chatbot', to: '/chatbot', icon: MessagesSquare },
]

export function AppSidebar() {
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar()

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#151515]/30 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobile}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-line bg-surface',
          'transition-[width,transform] duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0',
          collapsed ? 'w-80 px-3 lg:w-20' : 'w-[280px] px-4 lg:w-[264px]',
          mobileOpen ? 'translate-x-0 shadow-float' : '-translate-x-full',
        )}
        aria-label="Primary navigation"
      >
        <div
          className={cn(
            'relative flex h-20 shrink-0 items-center border-b border-line',
            collapsed ? 'lg:h-28 lg:flex-col lg:justify-center lg:gap-3' : 'lg:h-20',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 items-center gap-3',
              collapsed && 'lg:mx-auto',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-[#151515] shadow-[0_8px_20px_rgba(87,154,217,0.2)]">
              <Activity aria-hidden="true" className="size-5" strokeWidth={2} />
            </span>
            <span
              className={cn(
                'font-logo text-xl font-medium tracking-[-0.1em] text-ink',
                collapsed && 'lg:hidden',
              )}
            >
              MedIntel
            </span>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'absolute right-3 hidden size-9 items-center justify-center rounded-xl text-ink-muted transition-colors',
              'hover:bg-surface-muted hover:text-ink lg:flex',
              collapsed && 'lg:static lg:mx-0 lg:mt-0',
            )}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[18px]" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-[18px]" />
            )}
          </button>

          <button
            type="button"
            onClick={closeMobile}
            className="absolute right-3 flex size-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-1 py-6">
          <SidebarSection
            label="Navigation"
            items={navigationItems}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
          <SidebarSection
            label="Sectors"
            items={sectorItems}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
          <SidebarSection
            label="Research"
            items={researchItems}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        </nav>
      </aside>
    </>
  )
}
