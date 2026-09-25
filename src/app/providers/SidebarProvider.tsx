import { useEffect, useState, type ReactNode } from 'react'
import { SidebarContext } from '../../context/sidebar-context'

function getInitialCollapsedState() {
  return localStorage.getItem('medintel-sidebar-collapsed') === 'true'
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('medintel-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        toggleCollapsed: () => setCollapsed((current) => !current),
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
