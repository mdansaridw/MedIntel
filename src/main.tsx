import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SidebarProvider } from './app/providers/SidebarProvider'
import { ThemeProvider } from './app/providers/ThemeProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ThemeProvider>
  </StrictMode>,
)
