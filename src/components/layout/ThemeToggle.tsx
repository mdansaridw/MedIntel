import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line',
        'bg-surface-raised text-ink shadow-card transition-colors duration-200',
        'hover:border-accent hover:text-accent-strong',
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <Sun
        aria-hidden="true"
        className={cn(
          'absolute size-5 transition-all duration-200',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0',
        )}
        strokeWidth={1.8}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          'absolute size-5 transition-all duration-200',
          isDark ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
        strokeWidth={1.8}
      />
    </button>
  )
}
