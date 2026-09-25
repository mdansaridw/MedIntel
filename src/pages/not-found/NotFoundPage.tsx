import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { PageContainer } from '../../components/ui/PageContainer'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="Navigation" title="Page not found" />
      <PageContainer>
        <Card className="mx-auto flex min-h-96 max-w-xl flex-col items-center justify-center p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <SearchX aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold text-ink">
            This clinical view does not exist.
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
            The requested page may have moved or may not have been added yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#6aa9e0]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Return home
          </Link>
        </Card>
      </PageContainer>
    </>
  )
}
