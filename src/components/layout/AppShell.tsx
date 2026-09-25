import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { ChatbotFab } from './ChatbotFab'

export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#151515] transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <AppSidebar />
      <main id="main-content" className="min-w-0">
        <Outlet />
      </main>
      <ChatbotFab />
    </div>
  )
}
