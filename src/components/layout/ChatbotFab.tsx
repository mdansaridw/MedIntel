import { Bot, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ChatbotFab() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <>
      {open && (
        <section
          className="fixed bottom-24 right-4 z-50 flex h-[min(30rem,70vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-[24px] border border-line bg-surface-raised shadow-float sm:right-6"
          aria-label="Chatbot"
        >
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <Bot aria-hidden="true" className="size-[18px]" />
              </span>
              <h2 className="text-sm font-semibold text-ink">MedIntel Assistant</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="Close chatbot"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1" />
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-accent text-[#151515] shadow-float transition-transform duration-200 hover:scale-105 hover:bg-[#6aa9e0] sm:bottom-6 sm:right-6"
        aria-label={open ? 'Close chatbot' : 'Open chatbot'}
        aria-expanded={open}
      >
        {open ? (
          <X aria-hidden="true" className="size-6" strokeWidth={2} />
        ) : (
          <MessageCircle aria-hidden="true" className="size-6" strokeWidth={2} />
        )}
      </button>
    </>
  )
}
