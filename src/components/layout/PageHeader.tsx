import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSidebar } from '../../hooks/useSidebar'
import { NumericText } from '../ui/NumericText'
import { ThemeToggle } from './ThemeToggle'

interface PageHeaderProps {
  eyebrow?: string
  title?: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  const { openMobile } = useSidebar()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/88 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 w-full max-w-[1720px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMobile}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-raised text-ink shadow-card lg:hidden"
            aria-label="Open navigation"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          {(eyebrow || title || description) && (
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-strong">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h1 className="truncate font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
                  <NumericText text={title} />
                </h1>
              )}
              {description && (
                <p className="mt-1 hidden text-sm text-ink-muted sm:block">{description}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
