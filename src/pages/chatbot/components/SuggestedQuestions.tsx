import { useState } from 'react'
import { RotateCw } from 'lucide-react'

export interface FAQItem {
  id: string
  category: string
  question: string
}

interface SuggestedQuestionsProps {
  faqs: FAQItem[]
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ faqs, onSelect, disabled }: SuggestedQuestionsProps) {
  const [startIndex, setStartIndex] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  // Show all questions if 4 or fewer (individual patient mode), otherwise show 3 at a time (population mode)
  const visibleFaqs = faqs.length <= 4
    ? faqs
    : [
        faqs[startIndex % faqs.length],
        faqs[(startIndex + 1) % faqs.length],
        faqs[(startIndex + 2) % faqs.length]
      ].filter(Boolean)

  const handleRefresh = () => {
    setIsRotating(true)
    setStartIndex((prev) => (prev + 3) % Math.max(faqs.length, 1))
    setTimeout(() => setIsRotating(false), 500)
  }

  const getCategoryColor = (_category: string) => {
    // Elegant dark blue pill matching mockup
    return 'bg-[#0e2439] text-[#38bdf8] border-[#1d446a]'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold tracking-[0.08em] uppercase text-ink-muted">
          Suggested Questions
        </h3>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-accent transition-colors disabled:opacity-50"
          title="Refresh suggested questions"
        >
          <RotateCw
            className={`size-3.5 transition-transform ${isRotating ? 'rotate-180 duration-500' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visibleFaqs.map((faq) => (
          <button
            key={faq.id}
            type="button"
            onClick={() => onSelect(faq.question)}
            disabled={disabled}
            className="flex items-center gap-3 w-full text-left p-3.5 rounded-xl border border-line bg-surface hover:bg-surface-raised hover:border-accent/50 transition-all text-sm group disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            <span
              className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getCategoryColor(
                faq.category
              )}`}
            >
              {faq.category}
            </span>
            <span className="text-ink font-normal group-hover:text-accent transition-colors line-clamp-1">
              {faq.question}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
