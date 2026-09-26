import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../app/providers/ThemeProvider'
import { SidebarProvider } from '../../app/providers/SidebarProvider'

/**
 * Ten patients, large enough for the radar to have groups worth comparing.
 *
 *   group             members
 *   All patients      all 10
 *   Diabetes          p-2, p-3, p-4            (hba1c 6.6+)
 *   Hypertension      p-2, p-3, p-4, p-5, p-8, p-10
 *   High care burden  p-2, p-3, p-4, p-8       (10+ conditions)
 *
 * Only p-1 is inside both the BMI band and the BP target, so the two care-gap cards read
 * 10% with 9 patients to goal.
 */
const patients = [
  { id: 'p-1', bmi: 22, systolic_bp: 120, diastolic_bp: 75, hba1c: 5.4, condition_count: 2, conditions: ['Anemia (disorder)', 'Gingivitis (disorder)', 'Stress (finding)'] },
  { id: 'p-2', bmi: 34, systolic_bp: 152, diastolic_bp: 96, hba1c: 7.2, condition_count: 18, conditions: ['Type 2 diabetes (disorder)', 'Essential hypertension (disorder)', 'Metabolic syndrome X (disorder)', 'Chronic pain (disorder)', 'Stress (finding)'] },
  { id: 'p-3', bmi: 31, systolic_bp: 145, diastolic_bp: 92, hba1c: 7.0, condition_count: 14, conditions: ['Type 2 diabetes (disorder)', 'Essential hypertension (disorder)', 'Metabolic syndrome X (disorder)', 'Gingivitis (disorder)', 'Chronic pain (disorder)', 'Stress (finding)'] },
  { id: 'p-4', bmi: 29, systolic_bp: 138, diastolic_bp: 88, hba1c: 6.6, condition_count: 11, conditions: ['Anemia (disorder)', 'Essential hypertension (disorder)', 'Metabolic syndrome X (disorder)', 'Chronic pain (disorder)', 'Stress (finding)'] },
  { id: 'p-5', bmi: 27, systolic_bp: 150, diastolic_bp: 95, hba1c: 5.4, condition_count: 2, conditions: ['Anemia (disorder)', 'Essential hypertension (disorder)', 'Metabolic syndrome X (disorder)', 'Osteoarthritis (disorder)', 'Gingivitis (disorder)', 'Chronic pain (disorder)', 'Stress (finding)'] },
  { id: 'p-6', bmi: 33, systolic_bp: 132, diastolic_bp: 84, hba1c: 5.2, condition_count: 3, conditions: ['Metabolic syndrome X (disorder)', 'Osteoarthritis (disorder)'] },
  { id: 'p-7', bmi: 25, systolic_bp: 125, diastolic_bp: 80, hba1c: 5.6, condition_count: 2, conditions: ['Anemia (disorder)', 'Osteoarthritis (disorder)', 'Gingivitis (disorder)'] },
  { id: 'p-8', bmi: 30, systolic_bp: 148, diastolic_bp: 93, hba1c: 5.5, condition_count: 12, conditions: ['Essential hypertension (disorder)', 'Osteoarthritis (disorder)', 'Gingivitis (disorder)'] },
  { id: 'p-9', bmi: 26, systolic_bp: 130, diastolic_bp: 78, hba1c: 5.3, condition_count: 2, conditions: ['Anemia (disorder)', 'Gingivitis (disorder)', 'Chronic pain (disorder)'] },
  { id: 'p-10', bmi: 28, systolic_bp: 142, diastolic_bp: 90, hba1c: 5.8, condition_count: 2, conditions: ['Essential hypertension (disorder)', 'Osteoarthritis (disorder)', 'Gingivitis (disorder)', 'Chronic pain (disorder)'] },
].map((p) => ({
  name: `Patient ${p.id}`,
  birth_year: 1985,
  gender: 'F',
  race: 'white',
  medication_count: 3,
  ...p,
}))

/**
 * Ten advertised cohorts. Six qualify as spokes; the rest are the traps the radar filters
 * out — a finding strong enough to qualify but not a diagnosis, and two cohorts the graph
 * advertises at high prevalence that no patient carries at all.
 */
const cohorts = [
  { code: '0000-1', name: 'Anemia (disorder)', category: null, patient_count: 5, prevalence_pct: 50 },
  { code: '0000-2', name: 'Essential hypertension (disorder)', category: null, patient_count: 6, prevalence_pct: 60 },
  { code: '0000-3', name: 'Metabolic syndrome X (disorder)', category: null, patient_count: 5, prevalence_pct: 50 },
  { code: '0000-4', name: 'Osteoarthritis (disorder)', category: null, patient_count: 5, prevalence_pct: 50 },
  { code: '0000-5', name: 'Gingivitis (disorder)', category: null, patient_count: 7, prevalence_pct: 70 },
  { code: '0000-6', name: 'Chronic pain (disorder)', category: null, patient_count: 6, prevalence_pct: 60 },
  { code: '0000-7', name: 'Type 2 diabetes (disorder)', category: null, patient_count: 2, prevalence_pct: 20 },
  { code: '70232004', name: 'Stress (finding)', category: null, patient_count: 5, prevalence_pct: 50 },
  { code: '0000-8', name: 'Social isolation (finding)', category: null, patient_count: 61, prevalence_pct: 56.5 },
  { code: '306098002', name: 'Full-time employment (finding)', category: null, patient_count: 84, prevalence_pct: 77.8 },
]

const counts = {
  patients: 10,
  conditions: 10,
  medications: 8,
  allergies: 2,
  pharmacy_items: 4,
  supply_items: 3,
  total_nodes: 64,
  total_edges: 240,
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response
}

function stubHealthyApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/patients')) return Promise.resolve(jsonResponse(patients))
      if (url.includes('/cohorts')) return Promise.resolve(jsonResponse(cohorts))
      if (url.includes('/admin/stats')) {
        return Promise.resolve(jsonResponse({ timestamp: '', status: 'healthy', counts }))
      }
      return Promise.resolve(jsonResponse([]))
    }),
  )
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SidebarProvider>
          <DashboardPage />
        </SidebarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  // jsdom has no matchMedia, which ThemeProvider consults for the initial theme.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})
describe('DashboardPage', () => {
  it('renders live figures instead of the removed mock values', async () => {
    stubHealthyApi()

    renderDashboard()

    await waitFor(() => expect(screen.getByText('Patients in Graph')).toBeInTheDocument())

    expect(screen.getByText('Disease Cohorts')).toBeInTheDocument()
    expect(screen.getByText('BMI In Target')).toBeInTheDocument()
    expect(screen.getByText('BP At Target')).toBeInTheDocument()

    const summary = within(screen.getByRole('region', { name: 'Dashboard summary metrics' }))

    // Only p-1 is in the BMI band and at BP target, so both cards read 10%.
    expect(summary.getAllByText('10%')).toHaveLength(2)

    // Detail lines are split by NumericText, so assert on their combined text.
    const details = Array.from(document.querySelectorAll('p.mt-3')).map((el) => el.textContent)
    expect(details.filter((t) => t?.includes('9 patients to goal'))).toHaveLength(2)
    expect(screen.getByText('Cohort Disease Distribution')).toBeInTheDocument()

    // The old hardcoded mock numbers must not appear anywhere.
    expect(screen.queryByText('1,248')).not.toBeInTheDocument()
    expect(screen.queryByText('78.6%')).not.toBeInTheDocument()
  })

  it('sizes the distribution card to its content, not a flex basis of zero', async () => {
    // PageContainer is a column flex container, so `flex-1` on the card set flex-basis to 0
    // and pinned it at min-h-[24rem] (384px) while the chart inside overflowed. The card
    // then compressed its chart and the two panels collided. jsdom does no layout, so this
    // pins the cause directly.
    stubHealthyApi()

    renderDashboard()
    await waitFor(() => expect(screen.getByText('Cohort Disease Distribution')).toBeInTheDocument())

    const card = screen.getByLabelText('Cohort disease distribution')
    // A flex-basis of zero here is what capped the card below its content.
    expect(card.className).not.toMatch(/(^|\s)flex-1(\s|$)/)
    expect(card.className).toContain('shrink-0')
    // The old 24rem floor was sized for the shorter radar and is now a lie.
    expect(card.className).not.toContain('min-h-[24rem]')
  })

  it('never renders a graph statistic the live graph cannot support', async () => {
    // /api/admin/stats once returned hardcoded 68,649 observations and 194,320 edges for
    // a graph that holds 648 nodes and 3,519 relationships. Nothing may exceed these.
    stubHealthyApi()

    renderDashboard()
    await waitFor(() => expect(screen.getByText('Patients in Graph')).toBeInTheDocument())

    expect(document.body.textContent).not.toMatch(/68,?649/)
    expect(document.body.textContent).not.toMatch(/194,?320/)
    expect(document.body.textContent).not.toMatch(/71,?33[67]/)
  })

  it('draws the radar from the disease cohorts that separate the patient groups', async () => {
    stubHealthyApi()

    renderDashboard()
    await waitFor(() => expect(screen.getByText('Cohort Disease Distribution')).toBeInTheDocument())

    const card = screen.getByLabelText('Cohort disease distribution')

    // Six spokes, drawn widest-first by population prevalence. Rim labels wrap onto
    // <tspan> lines, so both elements are read. "Stress" separates the groups by 50pp but
    // is a finding, and "Type 2 diabetes" is carried by 2 patients, so neither may appear.
    const rim = Array.from(card.querySelectorAll('text, tspan')).map((t) => t.textContent)
    expect(rim).toContain('Gingivitis')
    expect(rim).toContain('Anemia')
    expect(rim).not.toContain('Stress')
    expect(rim).not.toContain('Type 2 diabetes')

    // The badge reports how many cohorts the graph advertises, not how many are drawn.
    const badge = screen.getByText('cohorts').closest('span') as HTMLElement
    expect(badge.querySelector('.numeric')?.textContent).toBe('10')

    // Every group is labelled with its real headcount.
    expect(screen.getByText('10 patients')).toBeInTheDocument()
    expect(screen.getByText('3 patients')).toBeInTheDocument()
    expect(screen.getByText('6 patients')).toBeInTheDocument()
    expect(screen.getByText('4 patients')).toBeInTheDocument()
  })

  it('renders every numeric readout in Inter via the numeric utility', async () => {
    stubHealthyApi()

    renderDashboard()
    await waitFor(() => expect(screen.getByText('Patients in Graph')).toBeInTheDocument())

    const summary = within(screen.getByRole('region', { name: 'Dashboard summary metrics' }))

    // Headline values are wholly numeric.
    for (const value of summary.getAllByText('10%')) {
      expect(value).toHaveClass('numeric')
    }

    // The chip statistic is Inter via NumericText, which splits out the digit run only.
    const chip = summary.getByText('edges').closest('span') as HTMLElement
    expect(chip.querySelector('.numeric')?.textContent).toBe('240')

    // The cohort-count badge.
    const badge = screen.getByText('cohorts').closest('span') as HTMLElement
    expect(badge.querySelector('.numeric')?.textContent).toBe('10')

    // The radar's ring scale carries digits, so it needs Inter too.
    const rings = Array.from(document.querySelectorAll('text.numeric'))
      .map((el) => el.textContent)
      .filter((t) => /^\d+$/.test(t ?? ''))
    expect(rings).toEqual(expect.arrayContaining(['25', '50', '75', '100']))

    // No leaf text node in the summary region shows a digit outside the Inter treatment.
    const region = screen.getByRole('region', { name: 'Dashboard summary metrics' })
    const bare = Array.from(region.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.children.length === 0 && /\d/.test(el.textContent ?? ''),
    )
    expect(bare.length).toBeGreaterThan(0)
    expect(bare.every((el) => el.classList.contains('numeric'))).toBe(true)
  })

  it('surfaces a retry state when the graph is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    renderDashboard()

    await waitFor(() => expect(screen.getByText('Clinical graph unavailable')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('patients, cohorts, graph telemetry')
  })

  it('still renders metrics when only graph telemetry fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/patients')) return Promise.resolve(jsonResponse(patients))
        if (url.includes('/cohorts')) return Promise.resolve(jsonResponse(cohorts))
        return Promise.reject(new Error('offline'))
      }),
    )

    renderDashboard()

    await waitFor(() => expect(screen.getByText('BMI In Target')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('graph telemetry')
  })
})
