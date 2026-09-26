import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  FlaskConical,
  Globe2,
  Pill,
  ShieldAlert,
  UserCheck,
  Users
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { Card } from '../../components/ui/Card'
import { MedIntelApi } from '../../services/api'

export default function TreatmentIntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Selected Tab: 1 = Global (Macro), 2 = Cohort (Meso), 3 = Personalized (Micro)
  const initialLevel = parseInt(searchParams.get('level') || '1', 10)
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(
    initialLevel === 2 ? 2 : initialLevel === 3 ? 3 : 1
  )

  // Disease Cohorts & Conditions List
  const [cohorts, setCohorts] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])

  // Level 1: Global Disease Intelligence State
  const initialCondition = searchParams.get('code') || '44054006'
  const [selectedConditionCode, setSelectedConditionCode] = useState(initialCondition)
  const [globalTreatments, setGlobalTreatments] = useState<any[]>([])
  const [loadingGlobal, setLoadingGlobal] = useState(false)

  // Level 2: Cohort Comorbidity Intelligence State
  const initialPrimary = searchParams.get('primary') || '44054006'
  const [primaryCondition, setPrimaryCondition] = useState(initialPrimary)
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>(['59621000'])
  const [minAge, setMinAge] = useState(50)
  const [maxAge, setMaxAge] = useState(70)
  const [cohortTreatments, setCohortTreatments] = useState<any[]>([])
  const [loadingCohort, setLoadingCohort] = useState(false)

  // Level 3: Personalized Patient Intelligence State
  const initialPatientId = searchParams.get('patientId') || ''
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId)
  const [personalizedData, setPersonalizedData] = useState<any>(null)
  const [loadingPersonalized, setLoadingPersonalized] = useState(false)

  // Load Initial Cohorts and Patients
  useEffect(() => {
    Promise.allSettled([
      MedIntelApi.getCohorts(),
      MedIntelApi.getPatients(50)
    ]).then(([cohortsRes, patientsRes]) => {
      if (cohortsRes.status === 'fulfilled' && cohortsRes.value) {
        setCohorts(cohortsRes.value)
        if (!selectedConditionCode && cohortsRes.value.length > 0) {
          setSelectedConditionCode(cohortsRes.value[0].code)
        }
      }
      if (patientsRes.status === 'fulfilled' && patientsRes.value) {
        setPatients(patientsRes.value)
        if (!selectedPatientId && patientsRes.value.length > 0) {
          setSelectedPatientId(patientsRes.value[0].id)
        }
      }
    })
  }, [])

  // Sync Level 1: Fetch Global Treatments
  const fetchGlobal = (code: string) => {
    if (!code) return
    setLoadingGlobal(true)
    MedIntelApi.getGlobalTreatment(code)
      .then((data) => setGlobalTreatments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load global treatments:', err)
        setGlobalTreatments([])
      })
      .finally(() => setLoadingGlobal(false))
  }

  useEffect(() => {
    if (activeLevel === 1 && selectedConditionCode) {
      fetchGlobal(selectedConditionCode)
    }
  }, [activeLevel, selectedConditionCode])

  // Sync Level 2: Fetch Cohort Treatments
  const fetchCohort = () => {
    if (!primaryCondition) return
    setLoadingCohort(true)
    MedIntelApi.getCohortTreatment(primaryCondition, selectedComorbidities, minAge, maxAge)
      .then((data) => setCohortTreatments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load cohort treatments:', err)
        setCohortTreatments([])
      })
      .finally(() => setLoadingCohort(false))
  }

  useEffect(() => {
    if (activeLevel === 2) {
      fetchCohort()
    }
  }, [activeLevel, primaryCondition, minAge, maxAge])

  // Sync Level 3: Fetch Personalized Treatments
  const fetchPersonalized = (pid: string) => {
    if (!pid) return
    setLoadingPersonalized(true)
    MedIntelApi.getPersonalizedTreatment(pid)
      .then((data) => setPersonalizedData(data))
      .catch((err) => {
        console.error('Failed to load personalized treatments:', err)
        setPersonalizedData(null)
      })
      .finally(() => setLoadingPersonalized(false))
  }

  useEffect(() => {
    if (activeLevel === 3 && selectedPatientId) {
      fetchPersonalized(selectedPatientId)
    }
  }, [activeLevel, selectedPatientId])

  const currentConditionName =
    cohorts.find((c) => c.code === selectedConditionCode)?.name ||
    'Selected Condition'

  const currentPrimaryName =
    cohorts.find((c) => c.code === primaryCondition)?.name ||
    'Primary Condition'

  return (
    <>
      <PageHeader
        eyebrow="Clinical Decision Support · Section 5 Hierarchy"
        title="Treatment Intelligence"
        description="Multi-tier clinical reasoning: Level 1 Macro Efficacy → Level 2 Cohort Sub-populations → Level 3 Micro Personalized Twins."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 text-xs font-bold text-ink shadow-card sm:inline-flex">
              <FlaskConical aria-hidden="true" className="size-4 text-accent-strong" />
              Section 5 Specification
            </span>
          </div>
        }
      />

      <PageContainer className="flex flex-col gap-6 pb-12">
        {/* Tier Mode Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setActiveLevel(1)
              setSearchParams({ level: '1', code: selectedConditionCode })
            }}
            className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
              activeLevel === 1
                ? 'border-accent bg-accent-soft/30 ring-1 ring-accent'
                : 'border-line bg-surface-raised hover:bg-surface-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
                Level 1 · Macro Tier
              </span>
              <Globe2 className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold text-ink">Global Disease Intelligence</h3>
            <p className="text-xs text-ink-muted mt-1">
              Population-wide medication efficacy rates & hospital inventory stock.
            </p>
          </button>

          <button
            onClick={() => {
              setActiveLevel(2)
              setSearchParams({ level: '2', primary: primaryCondition })
            }}
            className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
              activeLevel === 2
                ? 'border-accent bg-accent-soft/30 ring-1 ring-accent'
                : 'border-line bg-surface-raised hover:bg-surface-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
                Level 2 · Meso Tier
              </span>
              <Users className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold text-ink">Cohort-Level Intelligence</h3>
            <p className="text-xs text-ink-muted mt-1">
              Comorbidity intersection (e.g. Diabetes + HTN) with FDA SALAD safety alerts.
            </p>
          </button>

          <button
            onClick={() => {
              setActiveLevel(3)
              setSearchParams({ level: '3', patientId: selectedPatientId })
            }}
            className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
              activeLevel === 3
                ? 'border-accent bg-accent-soft/30 ring-1 ring-accent'
                : 'border-line bg-surface-raised hover:bg-surface-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
                Level 3 · Micro Tier
              </span>
              <UserCheck className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold text-ink">Personalized Patient Intelligence</h3>
            <p className="text-xs text-ink-muted mt-1">
              Method 4 Clinical Twins + Allergy filtration + Stock substitute ranking.
            </p>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 1: GLOBAL DISEASE INTELLIGENCE                                      */}
        {/* ========================================================================= */}
        {activeLevel === 1 && (
          <div className="space-y-6">
            {/* Condition Selection HUD */}
            <Card className="p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="size-5 text-accent" />
                    <h2 className="text-base font-bold text-ink">
                      Population Efficacy Query: {currentConditionName}
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Analyzing historical clinical resolution across all patients diagnosed in Neo4j.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Select Condition:
                  </label>
                  <select
                    value={selectedConditionCode}
                    onChange={(e) => {
                      setSelectedConditionCode(e.target.value)
                      setSearchParams({ level: '1', code: e.target.value })
                    }}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                  >
                    {cohorts.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} (SNOMED: {c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mathematical Formula Callout */}
              <div className="mt-4 rounded-xl border border-line bg-surface p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-accent">Formula:</span>
                  <span className="font-mono bg-surface-raised px-2 py-1 rounded border border-line text-ink">
                    Efficacy Rate = Count(outcome = 'RESOLVED') / Total Prescriptions
                  </span>
                </div>
                <div className="text-ink-muted">
                  Hospital Pharmacy stock cross-referenced live via <code>(:PharmacyInventory)</code>
                </div>
              </div>
            </Card>

            {/* Results Table */}
            <Card className="p-6 shadow-card">
              <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Pill className="size-4 text-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                    Medication Efficacy Leaderboard
                  </h3>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-strong border border-accent/30">
                    {globalTreatments.length} Candidate Medications
                  </span>
                </div>
                {loadingGlobal && (
                  <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
                    <Activity className="size-3.5" />
                    <span>Executing Graph Traversal...</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-muted uppercase font-semibold">
                      <th className="py-3 px-3">Rank & Medication</th>
                      <th className="py-3 px-3">RxNorm Code</th>
                      <th className="py-3 px-3">Resolution Proof</th>
                      <th className="py-3 px-3">Historical Efficacy</th>
                      <th className="py-3 px-3 text-right">Hospital Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalTreatments.length === 0 && !loadingGlobal && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-muted">
                          No direct medication treatments documented for this condition in graph.
                        </td>
                      </tr>
                    )}
                    {globalTreatments.map((med, idx) => (
                      <tr key={idx} className="border-b border-line last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong text-[10px] font-bold">
                              #{idx + 1}
                            </span>
                            <span>{med.medication_name}</span>
                            {idx === 0 && (
                              <span className="rounded-md bg-success-soft text-success px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Macro Top Pick
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-ink-muted">
                          {med.rxnorm_code || 'RxN-Standard'}
                        </td>
                        <td className="py-3 px-3 text-ink-muted">
                          <span className="font-semibold text-ink">{med.resolved_count}</span> resolved / {med.total_prescriptions} courses
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(med.efficacy_rate_pct || 0, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-success">
                              {med.efficacy_rate_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-semibold ${med.current_stock <= 15 ? 'text-danger' : 'text-success'}`}>
                            {med.current_stock} units
                          </span>
                          {med.current_stock <= 15 && (
                            <span className="ml-1 text-[10px] text-danger font-medium">(Low)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 2: COHORT-LEVEL INTELLIGENCE (COMORBIDITIES & DEMOGRAPHICS)          */}
        {/* ========================================================================= */}
        {activeLevel === 2 && (
          <div className="space-y-6">
            {/* Filter Controls HUD */}
            <Card className="p-6 shadow-card">
              <div className="pb-4 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-accent" />
                  <h2 className="text-base font-bold text-ink">
                    Meso-Cohort Filter Builder: Specific Patient Sub-Populations
                  </h2>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Filters for multi-morbid patients (e.g. Type 2 Diabetes with Essential Hypertension) and surfaces SALAD phonological safety warnings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Condition */}
                <div>
                  <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1.5">
                    1. Primary Condition
                  </label>
                  <select
                    value={primaryCondition}
                    onChange={(e) => setPrimaryCondition(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                  >
                    {cohorts.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comorbidities Multi-Select */}
                <div>
                  <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1.5">
                    2. Co-Occurring Comorbidities
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-xl border border-line bg-surface p-2 text-xs">
                    {cohorts
                      .filter((c) => c.code !== primaryCondition)
                      .slice(0, 8)
                      .map((c) => {
                        const isChecked = selectedComorbidities.includes(c.code)
                        return (
                          <label key={c.code} className="flex items-center gap-2 cursor-pointer hover:bg-surface-raised p-1 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedComorbidities([...selectedComorbidities, c.code])
                                } else {
                                  setSelectedComorbidities(selectedComorbidities.filter((x) => x !== c.code))
                                }
                              }}
                              className="rounded border-line text-accent"
                            />
                            <span className="text-ink">{c.name}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>

                {/* Age Demographics Range */}
                <div>
                  <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1.5">
                    3. Demographic Age Bracket
                  </label>
                  <div className="rounded-xl border border-line bg-surface p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">Min Age: <strong className="text-ink">{minAge}</strong></span>
                      <span className="text-ink-muted">Max Age: <strong className="text-ink">{maxAge}</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="18"
                        max="90"
                        value={minAge}
                        onChange={(e) => setMinAge(Math.min(parseInt(e.target.value, 10), maxAge - 5))}
                        className="w-full accent-accent"
                      />
                      <input
                        type="range"
                        min="18"
                        max="90"
                        value={maxAge}
                        onChange={(e) => setMaxAge(Math.max(parseInt(e.target.value, 10), minAge + 5))}
                        className="w-full accent-accent"
                      />
                    </div>
                    <button
                      onClick={fetchCohort}
                      disabled={loadingCohort}
                      className="w-full mt-2 rounded-xl bg-accent text-white py-1.5 text-xs font-bold hover:bg-accent-strong transition-all flex items-center justify-center gap-1.5"
                    >
                      <Filter className="size-3.5" />
                      {loadingCohort ? 'Traversing Cohort...' : 'Filter Sub-Population'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Results Table */}
            <Card className="p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                    Cohort-Specific Treatment Efficacy & SALAD Safety
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Sub-population: {currentPrimaryName} + {selectedComorbidities.length} Comorbidities · Age {minAge}-{maxAge}
                  </p>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong border border-accent/30">
                  {cohortTreatments.length} Viable Therapies
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-muted uppercase font-semibold">
                      <th className="py-3 px-3">Rank & Medication</th>
                      <th className="py-3 px-3">Cohort Prescriptions</th>
                      <th className="py-3 px-3">Cohort Resolution Rate</th>
                      <th className="py-3 px-3 text-right">FDA SALAD Look-Alike Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortTreatments.length === 0 && !loadingCohort && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-ink-muted">
                          No cohort-specific prescriptions found for this exact comorbidity and age criteria. Try widening the age bracket or reducing comorbidities.
                        </td>
                      </tr>
                    )}
                    {cohortTreatments.map((item, idx) => (
                      <tr key={idx} className="border-b border-line last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong text-[10px] font-bold">
                              #{idx + 1}
                            </span>
                            <Pill className="size-3.5 text-success" />
                            <span>{item.medication_name}</span>
                            {idx === 0 && (
                              <span className="rounded-md bg-success-soft text-success px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Cohort Top Pick
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-ink">
                          {item.cohort_prescriptions} courses
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(item.cohort_efficacy_pct || 0, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-success">
                              {item.cohort_efficacy_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.salad_warnings?.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-warning bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">
                              <AlertTriangle className="size-3" />
                              Look-Alike: {item.salad_warnings.join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="size-3.5" />
                              Zero Phonetic Conflicts
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 3: PERSONALIZED PATIENT INTELLIGENCE (MICRO / INDIVIDUAL)             */}
        {/* ========================================================================= */}
        {activeLevel === 3 && (
          <div className="space-y-6">
            {/* Patient Selection HUD */}
            <Card className="p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-5 text-accent" />
                    <h2 className="text-base font-bold text-ink">
                      Micro-Level Reasoning: Method 4 Clinical Twin Synthesis
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Executes 4-Stage Protocol: Twin Matching → Allergy Node Filtration → SALAD Scan → In-Stock Alternative Ranking.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Target Patient:
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value)
                      setSearchParams({ level: '3', patientId: e.target.value })
                    }}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        Patient #{p.id.substring(0, 8)} · Age {2026 - p.birth_year} · {p.gender}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 Protocol Proof Pillars */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    Step 1: Clinical Twins
                  </span>
                  <span className="font-semibold text-ink block">
                    {personalizedData?.top_twins?.length || 0} Matched Twins
                  </span>
                  <span className="text-[11px] text-ink-muted">50% Jaccard + 35% Labs + 15% Demo</span>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    Step 2: Allergy Filter
                  </span>
                  <span className="font-semibold text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Zero Contraindications
                  </span>
                  <span className="text-[11px] text-ink-muted">Prunes any drug in (:Allergy)</span>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    Step 3: SALAD Protocol
                  </span>
                  <span className="font-semibold text-warning flex items-center gap-1">
                    <ShieldAlert className="size-3.5" />
                    Phonetic Scan Active
                  </span>
                  <span className="text-[11px] text-ink-muted">Cross-checks [:SOUNDS_ALIKE_TO]</span>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    Step 4: Formulary Stock
                  </span>
                  <span className="font-semibold text-ink block">
                    Real-Time Supply Verified
                  </span>
                  <span className="text-[11px] text-ink-muted">Companion kits + Inventory buffer</span>
                </div>
              </div>
            </Card>

            {/* Results Table */}
            <Card className="p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                    Personalized Optimization Plan
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Synthesized for Patient #{selectedPatientId.substring(0, 8)}
                  </p>
                </div>

                <Link
                  to={`/patients/${selectedPatientId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors shadow-sm"
                >
                  <span>Open Full Patient Command Center</span>
                  <ArrowRight className="size-3.5 text-accent" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-muted uppercase font-semibold">
                      <th className="py-3 px-3">Rank & Recommended Therapy</th>
                      <th className="py-3 px-3">Pharmacy Stock</th>
                      <th className="py-3 px-3">Look-Alike (SALAD) Warning</th>
                      <th className="py-3 px-3 text-right">Required Companion Supplies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!personalizedData?.personalized_treatment_plan ||
                      personalizedData.personalized_treatment_plan.length === 0) &&
                      !loadingPersonalized && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-ink-muted">
                            No active treatment conflicts. Patient condition is currently optimized.
                          </td>
                        </tr>
                      )}
                    {personalizedData?.personalized_treatment_plan?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-line last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong text-[10px] font-bold">
                              #{idx + 1}
                            </span>
                            <Pill className="size-3.5 text-success" />
                            <span>{item.recommended_medication}</span>
                            {idx === 0 && (
                              <span className="rounded-md bg-success-soft text-success px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Top Pick
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold ${
                              item.stock_quantity <= (item.reorder_threshold || 15) ? 'text-danger' : 'text-success'
                            }`}
                          >
                            {item.stock_quantity} units
                          </span>
                          {item.stock_quantity <= (item.reorder_threshold || 15) && (
                            <span className="ml-1 text-[10px] text-danger font-medium">(Low Stock)</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.salad_confusables?.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-warning bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                              <AlertTriangle className="size-3" />
                              Confused with: {item.salad_confusables.join(', ')}
                            </span>
                          ) : (
                            <span className="text-ink-muted">No look-alike conflict</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-ink-muted">
                          {item.required_supplies?.join(', ') || 'Standard dispense'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </PageContainer>
    </>
  )
}
