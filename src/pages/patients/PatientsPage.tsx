import { UsersRound } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { mockPatients } from '../../data/mockPatients'
import { PatientCard } from './components/PatientCard'

export default function PatientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sectors"
        title="Patients"
        description="Browse the synthetic patient directory used in the MedIntel demonstration."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <UsersRound aria-hidden="true" className="size-4 text-accent-strong" />
            {mockPatients.length} patients
          </span>
        }
      />
      <PageContainer>
        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Patient directory"
        >
          {mockPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </section>
      </PageContainer>
    </>
  )
}
