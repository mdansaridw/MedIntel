import { FlaskConical } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { mockPatients } from '../../data/mockPatients'
import { mockTreatmentProfiles } from '../../data/mockTreatments'
import { TreatmentPatientCard } from './components/TreatmentPatientCard'

export default function TreatmentIntelligencePage() {
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Treatment Intelligence"
        description="Select a patient to explore mock biomarker control and treatment outcomes."
        action={
          <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink shadow-card sm:inline-flex">
            <FlaskConical aria-hidden="true" className="size-4 text-accent-strong" />
            {mockPatients.length} profiles
          </span>
        }
      />
      <PageContainer>
        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Patient treatment profiles"
        >
          {mockPatients.map((patient) => {
            const profile = mockTreatmentProfiles.find((item) => item.patientId === patient.id)
            if (!profile) return null
            return <TreatmentPatientCard key={patient.id} patient={patient} profile={profile} />
          })}
        </section>
      </PageContainer>
    </>
  )
}
