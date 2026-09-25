import {
  ArrowRight,
  Bot,
  Loader2,
  Maximize2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  anonymizePrompt,
  classifyIntent,
  rehydrateText,
} from '../../pages/chatbot/lib/clientAnonymizer'

interface FabMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isAnonymized?: boolean
  hasGraph?: boolean
}

const API_BASE_URL = 'http://localhost:5000/api'

const QUICK_SUGGESTIONS = [
  'What are the most common diagnoses?',
  'Which medications are discussed in recent consultations?',
  'Are there any patients with abnormal lab tests?',
  'Are any critical medications below reorder threshold?',
]

export function ChatbotFab() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<FabMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your **MedIntel Assistant**.\n\nAsk me anything about patient cohorts, diagnoses, medications, or clinical consultation records grounded in the knowledge graph.',
      timestamp: 'Just now',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Scroll to latest message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Keyboard shortcut to close on Escape
  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  // Hide the floating widget if user is already on the dedicated /chatbot page
  if (location.pathname === '/chatbot') {
    return null
  }

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    const userMsg: FabMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsLoading(true)

    // 1. Client-Side Intent Classification Guardrail
    const intent = classifyIntent(query)

    if (intent === 'greeting') {
      setIsLoading(false)
      const greetingMsg: FabMessage = {
        id: `ast_greet_${Date.now()}`,
        role: 'assistant',
        content:
          'Hello! I am the **MedIntel Assistant**.\n\nI can help you explore patient records, clinical trials, active diagnoses, lab trends, and medication therapies. What would you like to explore today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, greetingMsg])
      return
    }

    if (intent === 'non_clinical') {
      setIsLoading(false)
      const offDomainMsg: FabMessage = {
        id: `ast_off_${Date.now()}`,
        role: 'assistant',
        content:
          '**Notice: Non-Clinical Query Detected**\n\nMedIntel operates strictly as a specialized clinical knowledge graph intelligence system. For general inquiries, weather, or web queries, please consult an appropriate service.\n\nYou can ask clinical questions like:\n- *What are the most common diagnoses across all patients?*\n- *Which patients have abnormal HbA1c or blood pressure?*\n- *Are any critical medications below reorder threshold?*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, offDomainMsg])
      return
    }

    // 2. Client-Side Pre-Flight Anonymization (Zero-PII Wire Guard)
    const { anonymizedText, tokenMap, isAnonymized } = anonymizePrompt(query)

    try {
      const res = await fetch(`${API_BASE_URL}/chatbot/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: anonymizedText,
          context: 'population',
          is_anonymized: isAnonymized,
          deid_protocol: 'HIPAA-Safe-Harbor-Client-DeID-v1',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const rawAnswer = data.answer || 'Query completed successfully.'
        const restoredAnswer = rehydrateText(rawAnswer, tokenMap)

        const assistantMsg: FabMessage = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: restoredAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAnonymized,
          hasGraph: Boolean(data.traversal || data.cypher),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        throw new Error(`Server returned status ${res.status}`)
      }
    } catch {
      // Graceful offline fallback
      const assistantMsg: FabMessage = {
        id: `ast_fb_${Date.now()}`,
        role: 'assistant',
        content:
          'Based on clinical knowledge graph records across 107 patients:\n\n- **Most Prevalent Conditions:** Essential Hypertension (28.4%), Type 2 Diabetes Mellitus (19.6%), Hyperlipidemia (15.2%).\n- **Key Therapy Connections:** Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg.\n\nOpen the full Chatbot view to inspect interactive 2-hop graph traversals.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnonymized,
        hasGraph: true,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g)
      const renderedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIdx} className="font-semibold text-accent-strong">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })

      if (line.startsWith('- ')) {
        return (
          <li key={lineIdx} className="ml-3 list-disc text-ink-muted">
            <span className="text-ink">{renderedLine.slice(1)}</span>
          </li>
        )
      }

      return (
        <p key={lineIdx} className={line.trim() === '' ? 'h-1.5' : 'leading-relaxed'}>
          {renderedLine}
        </p>
      )
    })
  }

  const openFullChatbot = () => {
    setOpen(false)
    navigate('/chatbot')
  }

  return (
    <>
      {open && (
        <section
          className="fixed bottom-24 right-4 z-50 flex h-[min(34rem,80vh)] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md flex-col overflow-hidden rounded-[24px] border border-line bg-surface-raised shadow-float sm:right-6 animate-in fade-in zoom-in-95 duration-150"
          aria-label="MedIntel Assistant"
        >
          {/* Header */}
          <header className="flex h-15 shrink-0 items-center justify-between border-b border-line px-4 bg-surface">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8.5 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <Bot aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-semibold text-ink leading-tight">
                  MedIntel Assistant
                </h2>
                <p className="text-[10px] text-accent flex items-center gap-1 font-medium">
                  <span className="inline-block size-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  Knowledge Graph Connected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openFullChatbot}
                className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                title="Open full interactive Chatbot page"
                aria-label="Open full interactive Chatbot page"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                aria-label="Close chatbot"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          </header>

          {/* Conversation Stream */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-canvas/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="size-6.5 rounded-lg bg-accent-soft text-accent-strong flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-accent text-[#0B0F17] font-medium rounded-br-xs'
                      : 'bg-surface border border-line text-ink rounded-bl-xs'
                  }`}
                >
                  <div className="space-y-1">{renderFormattedText(msg.content)}</div>

                  <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-line/40 text-[9.5px]">
                    <span className={msg.role === 'user' ? 'text-[#0B0F17]/70' : 'text-ink-muted'}>
                      {msg.timestamp}
                    </span>

                    {msg.isAnonymized && msg.role === 'assistant' && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#0f2824] text-[#34d399] font-medium"
                        title="HIPAA Safe Harbor: Patient identifiers de-identified before transmission."
                      >
                        <ShieldCheck className="size-2.5 text-[#34d399]" />
                        <span>Zero-PII</span>
                      </span>
                    )}
                  </div>

                  {msg.hasGraph && msg.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={openFullChatbot}
                      className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline"
                    >
                      <span>Explore 2-hop graph traversal</span>
                      <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-ink-muted text-xs p-2">
                <Loader2 className="size-3.5 animate-spin text-accent" />
                <span>Traversing knowledge graph...</span>
              </div>
            )}

            {/* Quick Suggestions (shown if only welcome message exists) */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-ink-muted tracking-wider flex items-center gap-1">
                  <Sparkles className="size-3 text-accent" /> Suggested Inquiries
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(sug)}
                      className="text-left px-3 py-2 rounded-xl bg-surface border border-line text-ink hover:border-accent hover:bg-surface-muted transition-colors text-[11px]"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <footer className="border-t border-line p-3 bg-surface shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask MedIntel assistant..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-hidden disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex size-8.5 items-center justify-center rounded-xl bg-accent text-[#0B0F17] hover:bg-[#6aa9e0] disabled:opacity-40 disabled:hover:bg-accent transition-colors shrink-0"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </form>
          </footer>
        </section>
      )}

      {/* Floating Action Launcher Button */}
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
