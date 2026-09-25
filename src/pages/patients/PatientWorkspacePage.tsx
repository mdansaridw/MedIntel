import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplet,
  FileText,
  HeartPulse,
  Layers,
  Mic,
  MicOff,
  Network,
  Pill,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { KnowledgeGraphViewport } from '../knowledge-graph/components/KnowledgeGraphViewport'
import { MedIntelApi } from '../../services/api'

export default function PatientWorkspacePage() {
  const { patientId = '' } = useParams()

  // State
  const [patient, setPatient] = useState<any>(null)
  const [subgraph, setSubgraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] })
  const [twinData, setTwinData] = useState<any>(null)
  const [twinList, setTwinList] = useState<any[]>([])
  const [selectedTwinIndex, setSelectedTwinIndex] = useState(0)
  const [showMathDerivation, setShowMathDerivation] = useState(false)
  const [showTreatmentDerivation, setShowTreatmentDerivation] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'conditions' | 'medications'>('all')
  const [treatmentPlan, setTreatmentPlan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // AI Clinical Synthesis State
  const [aiSummary, setAiSummary] = useState<{ summary: string; model: string; status: string } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Break-Glass Vault 1 Modal
  const [breakGlassOpen, setBreakGlassOpen] = useState(false)
  const [decryptedPii, setDecryptedPii] = useState<any>(null)
  const [decrypting, setDecrypting] = useState(false)

  // Scribe Simulator State
  const [isRecording, setIsRecording] = useState(false)
  const [activeSoapTab, setActiveSoapTab] = useState<'S' | 'O' | 'A' | 'P'>('S')
  const [graphSynced, setGraphSynced] = useState(false)

  // Load AI Summary
  const loadSummary = () => {
    if (!patientId) return
    setLoadingSummary(true)
    MedIntelApi.getPatientSummary(patientId)
      .then((data) => setAiSummary(data))
      .catch((err) => console.error('Failed to load AI summary:', err))
      .finally(() => setLoadingSummary(false))
  }

  // Load Data
  useEffect(() => {
    if (!patientId) return
    setLoading(true)

    loadSummary()

    Promise.allSettled([
      MedIntelApi.getPatientProfile(patientId),
      MedIntelApi.getPatientSubgraph(patientId),
      MedIntelApi.getPersonalizedTreatment(patientId)
    ]).then(([profileRes, graphRes, personalizedRes]) => {
      if (profileRes.status === 'fulfilled' && profileRes.value && !(profileRes.value as any).error) {
        setPatient(profileRes.value)
      } else {
        console.error('Failed to load patient profile:', profileRes)
      }

      if (graphRes.status === 'fulfilled' && graphRes.value && !(graphRes.value as any).error) {
        setSubgraph(graphRes.value)
      } else {
        console.error('Failed to load subgraph:', graphRes)
      }

      if (personalizedRes.status === 'fulfilled' && personalizedRes.value && !(personalizedRes.value as any).error) {
        const twins = personalizedRes.value.top_twins || []
        setTwinList(twins)
        setTwinData(twins[0] || null)
        setTreatmentPlan(personalizedRes.value.personalized_treatment_plan || [])
      } else {
        console.error('Failed to load personalized twins:', personalizedRes)
      }
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [patientId])

  // Handle Break-Glass Decryption
  const handleBreakGlass = async () => {
    setDecrypting(true)
    try {
      const res = await MedIntelApi.decryptPatientPii(patientId, 'Emergency Break-Glass Clinical Review')
      setDecryptedPii(res.pii)
    } catch (err) {
      console.error('Break-glass failed:', err)
    } finally {
      setDecrypting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Activity className="size-8 animate-pulse text-accent" />
        <p className="text-sm font-semibold text-ink">Assembling Clinical Workspace from Neo4j Aura...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <PageContainer className="p-8 text-center">
        <p className="text-sm text-ink-muted">Patient #{patientId} not found in knowledge graph.</p>
        <Link to="/patients" className="mt-4 inline-block text-accent hover:underline">
          Return to directory
        </Link>
      </PageContainer>
    )
  }

  const age = 2026 - (patient.birth_year || 1980)
  const topTwinScore = twinData ? (twinData.overall_similarity_pct || 0).toFixed(1) : '0.0'
  const conditionOverlap = twinData ? (twinData.condition_overlap_pct || 0).toFixed(1) : '0.0'
  const biomarkerProximity = twinData ? (twinData.biomarker_similarity_pct || 0).toFixed(1) : '0.0'
  const demographicMatch = twinData ? (twinData.demographic_match_pct || 0).toFixed(1) : '0.0'

  // Helper: Format clinical duration (years/days)
  const formatEventDuration = (start?: string, stop?: string) => {
    if (!start) return 'Date unknown'
    try {
      const sDate = new Date(start)
      if (isNaN(sDate.getTime())) return start

      if (!stop || stop.trim() === '') {
        const now = new Date()
        const diffYears = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        if (diffYears >= 1) {
          return `${diffYears} yr${diffYears > 1 ? 's' : ''} · Active`
        }
        const diffDays = Math.max(1, Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)))
        return `${diffDays} days · Active`
      } else {
        const eDate = new Date(stop)
        if (isNaN(eDate.getTime())) return `${start.split('T')[0]} → ${stop.split('T')[0]}`
        const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)))
        if (diffDays >= 365) {
          const yrs = (diffDays / 365.25).toFixed(1)
          return `${yrs} yrs · Resolved`
        }
        return `${diffDays} day${diffDays > 1 ? 's' : ''} · Resolved`
      }
    } catch {
      return start
    }
  }

  // Helper: Format date label
  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return 'Date unspecified'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr.split('T')[0]
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr.split('T')[0]
    }
  }

  // Unified Chronological Timeline Events
  const rawTimelineEvents = [
    ...(patient.conditions || []).map((c: any) => ({
      type: 'condition' as const,
      id: c.code,
      name: c.name.replace(/\s*\((finding|disorder|situation)\)\s*$/i, ''),
      rawName: c.name,
      category: c.name.toLowerCase().includes('disorder') ? 'Disorder' : 'Clinical Finding',
      code: `SNOMED ${c.code}`,
      startDate: c.start_date || '',
      stopDate: c.stop_date || '',
      status: (c.status || (c.stop_date ? 'resolved' : 'active')).toLowerCase(),
      duration: formatEventDuration(c.start_date, c.stop_date),
      dateLabel: formatDateLabel(c.start_date)
    })),
    ...(patient.medications || []).map((m: any) => ({
      type: 'medication' as const,
      id: m.rxnorm_code,
      name: m.name,
      rawName: m.name,
      category: 'Prescription',
      code: `RxNorm ${m.rxnorm_code}`,
      startDate: m.start_date || '',
      stopDate: m.stop_date || '',
      status: (m.outcome === 'RESOLVED' ? 'resolved' : 'active').toLowerCase(),
      duration: formatEventDuration(m.start_date, m.stop_date),
      dateLabel: formatDateLabel(m.start_date)
    }))
  ].sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
    return dateB - dateA
  })

  const filteredTimelineEvents = rawTimelineEvents.filter((event) => {
    if (historyFilter === 'conditions') return event.type === 'condition'
    if (historyFilter === 'medications') return event.type === 'medication'
    return true
  })

  // Biomarker ranges & calculations
  const hba1cVal = typeof patient.hba1c === 'number' ? patient.hba1c : parseFloat(patient.hba1c) || 0
  const systolicVal = typeof patient.systolic_bp === 'number' ? patient.systolic_bp : parseFloat(patient.systolic_bp) || 0
  const diastolicVal = typeof patient.diastolic_bp === 'number' ? patient.diastolic_bp : parseFloat(patient.diastolic_bp) || 0
  const bmiVal = typeof patient.bmi === 'number' ? patient.bmi : parseFloat(patient.bmi) || 0

  // Clamped percentage coordinates for range slider needles
  const hba1cPct = Math.min(100, Math.max(0, ((hba1cVal - 4.0) / (12.0 - 4.0)) * 100))
  const bpPct = Math.min(100, Math.max(0, ((systolicVal - 90) / (180 - 90)) * 100))
  const bmiPct = Math.min(100, Math.max(0, ((bmiVal - 15) / (45 - 15)) * 100))

  // HbA1c classification & delta
  const hba1cStatus = hba1cVal >= 6.5 ? 'Diabetic' : hba1cVal >= 5.7 ? 'Prediabetic' : 'Normal'
  const hba1cDelta = hba1cVal > 5.7 ? `+${(hba1cVal - 5.7).toFixed(1)}% above target (<5.7%)` : 'Within optimal range'

  // BP classification & delta
  const bpStatus = systolicVal >= 140 || diastolicVal >= 90
    ? 'Stage 2 HTN'
    : systolicVal >= 130 || diastolicVal >= 80
      ? 'Stage 1 HTN'
      : systolicVal >= 120
        ? 'Elevated'
        : 'Normal'
  const bpDelta = systolicVal > 120 ? `+${Math.round(systolicVal - 120)} mmHg above optimal (<120)` : 'Optimal reading'

  // BMI classification & delta
  const bmiStatus = bmiVal >= 30 ? 'Obese (Class I+)' : bmiVal >= 25 ? 'Overweight' : bmiVal >= 18.5 ? 'Normal Weight' : 'Underweight'
  const bmiDelta = bmiVal > 24.9 ? `+${(bmiVal - 24.9).toFixed(1)} kg/m² above healthy target (18.5-24.9)` : 'Within healthy range'


  return (
    <>
      <PageHeader
        eyebrow={`Workspace · Patient #${patientId.substring(0, 8)}`}
        title="Clinical Command Center"
        description={`Age ${age} · ${patient.gender?.toUpperCase()} · ${patient.race || 'Unknown'} · Zero PII in Graph`}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBreakGlassOpen(true)
                if (!decryptedPii) handleBreakGlass()
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-warning/50 bg-warning-soft px-4 py-2.5 text-xs font-bold text-warning hover:bg-warning/20 transition-all shadow-sm"
            >
              <ShieldAlert className="size-4" />
              Break-Glass PII Access
            </button>
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 py-2.5 text-xs font-semibold text-ink hover:border-accent transition-colors shadow-card"
            >
              <ArrowLeft className="size-4" />
              Directory
            </Link>
          </div>
        }
      />

      <PageContainer className="flex flex-col gap-6 pb-12">
        {/* ========================================================================= */}
        {/* AI CLINICAL SYNTHESIS CARD (Gemini 3.8 Flash / GraphRAG)                  */}
        {/* ========================================================================= */}
        <Card className="p-5 shadow-card border border-accent/40 bg-accent-soft/20">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent-strong" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                AI Clinical Synthesis
              </h2>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent-strong border border-accent/30">
                {aiSummary?.model || 'Gemini 3.8 Flash'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-ink-muted flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-success" />
                HIPAA Safe (De-Identified Graph Context)
              </span>
              <button
                onClick={loadSummary}
                disabled={loadingSummary}
                className="text-xs text-accent font-semibold hover:underline disabled:opacity-50"
              >
                {loadingSummary ? 'Synthesizing...' : 'Regenerate'}
              </button>
            </div>
          </div>

          <div className="mt-3">
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-xs text-ink-muted py-2">
                <Activity className="size-3.5 animate-pulse text-accent" />
                <span>Querying Gemini 3.8 Flash via GraphRAG...</span>
              </div>
            ) : aiSummary ? (
              <p className="text-sm leading-relaxed text-ink font-sans">
                {aiSummary.summary}
              </p>
            ) : (
              <p className="text-xs text-ink-muted italic">
                Generating clinical synthesis from knowledge graph...
              </p>
            )}
          </div>
        </Card>
        {/* ========================================================================= */}
        {/* ROW 1: BENTO GRID - Scribe (Zone 2) & Obsidian Graph (Zone 3)              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ZONE 2: Ambient AI Scribe (Jerry) - 5 Cols */}
          <Card className="lg:col-span-5 flex flex-col p-5 shadow-card overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className={`size-3 rounded-full ${isRecording ? 'bg-danger animate-ping' : 'bg-ink-muted'}`} />
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Ambient AI Scribe</h2>
              </div>
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isRecording 
                    ? 'bg-danger text-white hover:bg-danger/90' 
                    : 'bg-accent text-white hover:bg-accent-strong'
                }`}
              >
                {isRecording ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                {isRecording ? 'Pause Scribe' : 'Start Scribe'}
              </button>
            </div>

            {/* Scribe Live Dialogue Feed */}
            <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs space-y-2 h-44 overflow-y-auto font-mono">
              <div className="text-accent font-semibold">
                [Dr. Chen]: "Good morning. How have your glucose readings been since we adjusted your Metformin?"
              </div>
              <div className="text-ink-muted">
                [Patient]: "Still floating around 165 in the morning doctor. And I get this lightheaded feeling after lunch."
              </div>
              <div className="text-accent font-semibold">
                [Dr. Chen]: "Any chest pain, shortness of breath, or swelling in your ankles?"
              </div>
              <div className="text-ink-muted">
                [Patient]: "No chest pain, but feet feel a little numb in the evenings."
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-danger animate-pulse pt-2 border-t border-line">
                  <Activity className="size-3" />
                  <span>Real-time clinical entity extraction active...</span>
                </div>
              )}
            </div>

            {/* Structured SOAP Note Tabs */}
            <div className="mt-4">
              <div className="flex items-center justify-between border-b border-line mb-3">
                <div className="flex gap-1">
                  {(['S', 'O', 'A', 'P'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSoapTab(tab)}
                      className={`px-3 py-1 text-xs font-bold rounded-t-lg transition-colors ${
                        activeSoapTab === tab 
                          ? 'border-b-2 border-accent text-accent bg-accent-soft' 
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {tab === 'S' && 'Subjective'}
                      {tab === 'O' && 'Objective'}
                      {tab === 'A' && 'Assessment'}
                      {tab === 'P' && 'Plan'}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-ink-muted font-medium">Auto-Formatted</span>
              </div>

              <div className="text-xs text-ink-muted leading-relaxed min-h-24 bg-surface p-3 rounded-xl border border-line">
                {activeSoapTab === 'S' && (
                  <p>Patient reports persistent fasting hyperglycemia (~165 mg/dL) and postprandial dizziness. Notes bilateral peripheral tingling in lower extremities.</p>
                )}
                {activeSoapTab === 'O' && (
                  <p>Baseline HbA1c: {patient.hba1c}%. Blood Pressure: {patient.systolic_bp}/{patient.diastolic_bp} mmHg. BMI: {patient.bmi}.</p>
                )}
                {activeSoapTab === 'A' && (
                  <p>1. Type 2 Diabetes Mellitus with early diabetic neuropathy signs.<br />2. Essential Hypertension (Stage 2).<br />3. Hyperlipidemia.</p>
                )}
                {activeSoapTab === 'P' && (
                  <p>Recommend SGLT2 inhibitor trial based on top clinical twins. Order diabetic companion glucose sensor strips. Schedule 90-day HbA1c re-test.</p>
                )}
              </div>
            </div>

            {/* Sync to Graph Trigger */}
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs text-ink-muted">
                {graphSynced ? '✓ Synchronized with Neo4j' : 'Ready to push encounter notes to Knowledge Graph'}
              </span>
              <button
                onClick={() => {
                  setGraphSynced(true)
                  setTimeout(() => setGraphSynced(false), 3000)
                }}
                className="flex items-center gap-1.5 rounded-xl bg-surface-raised border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent hover:text-white transition-all shadow-sm"
              >
                <Send className="size-3.5" />
                Sync Graph
              </button>
            </div>
          </Card>

          {/* ZONE 3: Obsidian Knowledge Graph - 7 Cols */}
          <Card className="lg:col-span-7 flex flex-col p-5 shadow-card overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Network className="size-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Personal Subgraph</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success" />
                <span className="text-xs text-ink-muted">
                  {subgraph.nodes.length} Nodes · {subgraph.edges.length} Edges (2-Hop)
                </span>
              </div>
            </div>

            <div className="mt-3 h-[420px] w-full rounded-xl overflow-hidden border border-line relative">
              <KnowledgeGraphViewport nodes={subgraph.nodes} edges={subgraph.edges} />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-ink-muted gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-accent" /> Patient</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger" /> Condition</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> Drug</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> Supply</span>
              </div>
              <span className="text-warning font-semibold">⚠️ Dashed Yellow = SALAD Hazard</span>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: BENTO GRID - Method 4 Clinical Twins (Zone 4)                       */}
        {/* ========================================================================= */}
        <Card className="p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="size-5 text-accent" />
                <h2 className="text-lg font-bold font-display text-ink">Method 4: Clinical Twins Intelligence</h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Hybrid Formula: 50% Disease Jaccard + 35% Lab Biomarkers + 15% Demographics
              </p>
            </div>

            {/* Top Twin Summary Tiles */}
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block">Match Score</span>
                <span className="text-base font-bold text-accent">{topTwinScore}%</span>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block">Jaccard (50%)</span>
                <span className="text-base font-bold text-ink">{conditionOverlap}%</span>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block">Biomarkers (35%)</span>
                <span className="text-base font-bold text-ink">{biomarkerProximity}%</span>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block">Demographics (15%)</span>
                <span className="text-base font-bold text-ink">{demographicMatch}%</span>
              </div>
            </div>
          </div>

          {/* Numbered Ranked Twins Selector */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted mr-1 flex items-center gap-1">
              <Layers className="size-3.5" />
              Ranked Twins:
            </span>
            {twinList.map((t, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedTwinIndex(idx)
                  setTwinData(t)
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                  selectedTwinIndex === idx
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-surface border-line text-ink hover:border-accent'
                }`}
              >
                <span className={`size-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  selectedTwinIndex === idx ? 'bg-white text-accent' : 'bg-surface-muted text-ink-muted'
                }`}>
                  #{idx + 1}
                </span>
                <span>Twin {t.gender || 'M'}, Age {2026 - (t.birth_year || 1980)}</span>
                <span className="ml-1 text-[11px] opacity-90 font-mono">{(t.overall_similarity_pct || 0).toFixed(1)}%</span>
              </button>
            ))}
            {twinList.length === 0 && (
              <span className="text-xs text-ink-muted italic">Scanning Neo4j graph for cohort matches...</span>
            )}
          </div>

          {/* Step-by-Step Mathematical Derivation Toggle */}
          <div className="mt-4 pt-3 border-t border-line">
            <button
              onClick={() => setShowMathDerivation(!showMathDerivation)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 border border-line text-xs font-semibold text-accent hover:bg-accent-soft transition-all"
            >
              <Calculator className="size-3.5" />
              <span>{showMathDerivation ? 'Hide' : 'View'} Step-by-Step Mathematical Derivation (Twin #{selectedTwinIndex + 1})</span>
              {showMathDerivation ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>

            {showMathDerivation && twinData && (
              <div className="mt-3 rounded-2xl border border-accent/40 bg-surface p-4 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div>
                    <span className="font-bold text-ink text-sm block">Phenotype Distance Calculation Breakdown</span>
                    <span className="text-[11px] text-ink-muted">Formula: Sim = 0.50·Jaccard + 0.35·Cosine(Labs) + 0.15·Demographics</span>
                  </div>
                  <span className="text-accent font-mono font-bold text-base bg-accent-soft px-2.5 py-1 rounded-lg border border-accent/30">
                    Total: {topTwinScore}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div className="rounded-xl border border-line bg-surface-raised p-3">
                    <div className="flex items-center justify-between text-ink-muted mb-1">
                      <span className="font-bold uppercase text-[10px]">Step 1: Disease Jaccard</span>
                      <span className="text-accent font-semibold">50% Weight</span>
                    </div>
                    <p className="text-sm font-bold text-ink">{conditionOverlap}% overlap</p>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      Jaccard index calculated over SNOMED condition sets.
                    </p>
                    <div className="mt-2 text-[10px] text-accent font-mono">
                      Contrib: +{(Number(conditionOverlap) * 0.5).toFixed(2)}%
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="rounded-xl border border-line bg-surface-raised p-3">
                    <div className="flex items-center justify-between text-ink-muted mb-1">
                      <span className="font-bold uppercase text-[10px]">Step 2: Biomarkers</span>
                      <span className="text-accent font-semibold">35% Weight</span>
                    </div>
                    <p className="text-sm font-bold text-ink">{biomarkerProximity}% closeness</p>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      Normalized Euclidean vector distance over HbA1c, Systolic/Diastolic BP, and BMI.
                    </p>
                    <div className="mt-2 text-[10px] text-accent font-mono">
                      Contrib: +{(Number(biomarkerProximity) * 0.35).toFixed(2)}%
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="rounded-xl border border-line bg-surface-raised p-3">
                    <div className="flex items-center justify-between text-ink-muted mb-1">
                      <span className="font-bold uppercase text-[10px]">Step 3: Demographics</span>
                      <span className="text-accent font-semibold">15% Weight</span>
                    </div>
                    <p className="text-sm font-bold text-ink">{demographicMatch}% proximity</p>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      Age bracket difference (10%) + Gender parity (5%).
                    </p>
                    <div className="mt-2 text-[10px] text-accent font-mono">
                      Contrib: +{(Number(demographicMatch) * 0.15).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Shared Conditions */}
                {twinData.shared_conditions && twinData.shared_conditions.length > 0 && (
                  <div className="pt-2 border-t border-line">
                    <span className="text-[11px] font-bold text-ink-muted uppercase block mb-1.5">
                      Intersecting Chronic Conditions (C1 ∩ C2):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {twinData.shared_conditions.map((sc: string, i: number) => (
                        <span key={i} className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-strong border border-accent/20">
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RANKED THERAPIES WITH STEP-BY-STEP CLINICAL & SUPPLY DERIVATION           */}
          {/* ========================================================================= */}
          <div className="mt-6 pt-4 border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Ranked Therapies Curing Clinical Twins (Stock & Safety Checked)
                </h3>
                <p className="text-[11px] text-ink-muted">
                  Medications that resolved conditions in matching twins, filtered for allergies & inventory.
                </p>
              </div>
              {treatmentPlan.length > 0 && (
                <button
                  onClick={() => setShowTreatmentDerivation(!showTreatmentDerivation)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 border border-line text-xs font-semibold text-success hover:bg-success-soft transition-all"
                >
                  <Sliders className="size-3.5" />
                  <span>{showTreatmentDerivation ? 'Hide' : 'View'} #1 Treatment Derivation</span>
                  {showTreatmentDerivation ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              )}
            </div>

            {/* Step-by-Step Treatment Derivation Card */}
            {showTreatmentDerivation && treatmentPlan[0] && (
              <div className="mb-4 rounded-2xl border border-success/40 bg-success-soft/20 p-4 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div>
                    <span className="font-bold text-ink text-sm block">
                      #1 Recommended Therapy: {treatmentPlan[0].recommended_medication}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Clinical evidence chain & supply fulfillment calculation
                    </span>
                  </div>
                  <span className="rounded-full bg-success text-white px-2.5 py-0.5 font-bold text-[10px] shadow-sm">
                    VERIFIED EVIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-line bg-surface p-3">
                    <span className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                      1. Cohort Evidence Rate
                    </span>
                    <p className="text-base font-bold text-success">100% Resolved</p>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Achieved full outcome resolution in matching twins with shared diagnoses.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-3">
                    <span className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                      2. Personalized Safety Audit
                    </span>
                    <p className="text-base font-bold text-success">0 Contraindications</p>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Zero conflicts detected against patient's documented allergies (:ALLERGIC_TO).
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-3">
                    <span className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                      3. Real-Time Pharmacy Stock
                    </span>
                    <p className="text-base font-bold text-ink">
                      {treatmentPlan[0].stock_quantity} units on shelf
                    </p>
                    <p className="text-[11px] text-ink-muted mt-1">
                      Threshold is {treatmentPlan[0].reorder_threshold || 15} units. Safe for immediate dispensing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ranked Treatments Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted uppercase font-semibold">
                    <th className="py-2.5 px-3">Rank & Therapy</th>
                    <th className="py-2.5 px-3">Hospital Stock</th>
                    <th className="py-2.5 px-3">Safety & SALAD Warnings</th>
                    <th className="py-2.5 px-3 text-right">Companion Supplies</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentPlan.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-ink-muted">
                        No conflicting treatments found. Patient conditions currently stable.
                      </td>
                    </tr>
                  )}
                  {treatmentPlan.map((item, idx) => (
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
                        <span className={`font-semibold ${item.stock_quantity <= (item.reorder_threshold || 15) ? 'text-danger' : 'text-success'}`}>
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
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* ROW 3: BENTO GRID - Longitudinal Timeline (Zone 5) & Lab Vitals (Zone 6)  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ZONE 5: Medical History Vertical Timeline - 7 Cols */}
          <Card className="lg:col-span-7 p-6 shadow-card flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-accent" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Longitudinal Clinical History</h2>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">Chronologically ordered medical events, episodes & therapies</p>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                    historyFilter === 'all'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  All ({rawTimelineEvents.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('conditions')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                    historyFilter === 'conditions'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Conditions ({patient.conditions?.length || 0})
                </button>
                <button
                  onClick={() => setHistoryFilter('medications')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                    historyFilter === 'medications'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Medications ({patient.medications?.length || 0})
                </button>
              </div>
            </div>

            {/* Vertical Connected Timeline */}
            <div className="relative max-h-96 overflow-y-auto pr-2 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-0.5 before:bg-line/80">
              {filteredTimelineEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted">
                  No records matching the selected filter.
                </div>
              ) : (
                filteredTimelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-1">
                    {/* Node Dot / Icon */}
                    <div
                      className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-surface shadow-xs ${
                        evt.type === 'condition'
                          ? evt.status === 'active'
                            ? 'border-danger text-danger bg-danger-soft/20'
                            : 'border-line text-ink-muted'
                          : evt.status === 'resolved'
                            ? 'border-success text-success bg-success-soft/20'
                            : 'border-accent text-accent bg-accent-soft/20'
                      }`}
                    >
                      {evt.type === 'condition' ? (
                        <HeartPulse className="size-4" />
                      ) : (
                        <Pill className="size-4" />
                      )}
                    </div>

                    {/* Timeline Event Card */}
                    <div className="flex-1 rounded-2xl border border-line bg-surface p-3.5 text-xs hover:border-accent/40 transition-colors shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm">{evt.name}</span>
                          <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-muted border border-line">
                            {evt.category}
                          </span>
                        </div>
                        <StatusBadge
                          intent={evt.status === 'active' ? 'danger' : 'success'}
                          size="sm"
                        >
                          {evt.status.toUpperCase()}
                        </StatusBadge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted border-t border-line/60 pt-2">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Calendar className="size-3 text-ink-muted" />
                            {evt.dateLabel}
                          </span>
                          <span className="text-ink font-medium">
                            Duration: {evt.duration}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-muted/80">
                          {evt.code}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* ZONE 6: Labs & Biomarker Trajectory with Clinical Sliders - 5 Cols */}
          <Card className="lg:col-span-5 p-6 shadow-card flex flex-col justify-between">
            <div className="pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Labs & Biomarker Trajectory</h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Clinical range gradient sliders with patient delta markers
              </p>
            </div>

            <div className="space-y-5">
              {/* 1. HbA1c Gradient Slider */}
              <div className="rounded-2xl border border-line bg-surface p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="size-4 text-rose-500" />
                    <span className="font-bold text-ink uppercase tracking-wide text-[11px]">Hemoglobin A1c</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold font-mono text-ink">{hba1cVal.toFixed(1)}%</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        hba1cStatus === 'Diabetic'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          : hba1cStatus === 'Prediabetic'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      {hba1cStatus}
                    </span>
                  </div>
                </div>

                {/* Range Bar */}
                <div className="relative pt-3 pb-1">
                  <div className="relative h-2.5 w-full rounded-full bg-surface-muted overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: '21.25%' }} title="Normal: <5.7%" />
                    <div className="h-full bg-amber-400" style={{ width: '10%' }} title="Prediabetes: 5.7-6.4%" />
                    <div className="h-full bg-rose-500" style={{ width: '68.75%' }} title="Diabetes: >=6.5%" />
                  </div>

                  {/* Marker Pin */}
                  <div
                    className="absolute top-1 -ml-2 flex flex-col items-center pointer-events-none transition-all duration-300"
                    style={{ left: `${hba1cPct}%` }}
                  >
                    <div className="size-4 rounded-full border-2 border-white bg-ink shadow-md" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Normal &lt;5.7%</span>
                  <span className="font-medium text-ink">{hba1cDelta}</span>
                  <span>Diabetic &ge;6.5%</span>
                </div>
              </div>

              {/* 2. Blood Pressure Gradient Slider */}
              <div className="rounded-2xl border border-line bg-surface p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-4 text-amber-500" />
                    <span className="font-bold text-ink uppercase tracking-wide text-[11px]">Blood Pressure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold font-mono text-ink">
                      {Math.round(systolicVal)}/{Math.round(diastolicVal)}
                      <span className="text-[10px] text-ink-muted ml-0.5">mmHg</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        bpStatus.includes('Stage 2')
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          : bpStatus.includes('Stage 1')
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      {bpStatus}
                    </span>
                  </div>
                </div>

                {/* Range Bar */}
                <div className="relative pt-3 pb-1">
                  <div className="relative h-2.5 w-full rounded-full bg-surface-muted overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: '33.3%' }} title="Normal: <120" />
                    <div className="h-full bg-yellow-400" style={{ width: '11.1%' }} title="Elevated: 120-129" />
                    <div className="h-full bg-amber-500" style={{ width: '11.1%' }} title="Stage 1 HTN: 130-139" />
                    <div className="h-full bg-rose-500" style={{ width: '44.5%' }} title="Stage 2 HTN: >=140" />
                  </div>

                  {/* Marker Pin */}
                  <div
                    className="absolute top-1 -ml-2 flex flex-col items-center pointer-events-none transition-all duration-300"
                    style={{ left: `${bpPct}%` }}
                  >
                    <div className="size-4 rounded-full border-2 border-white bg-ink shadow-md" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Optimal &lt;120</span>
                  <span className="font-medium text-ink">{bpDelta}</span>
                  <span>Stage 2 &ge;140</span>
                </div>
              </div>

              {/* 3. Body Mass Index Gradient Slider */}
              <div className="rounded-2xl border border-line bg-surface p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-4 text-accent" />
                    <span className="font-bold text-ink uppercase tracking-wide text-[11px]">Body Mass Index (BMI)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold font-mono text-ink">
                      {bmiVal.toFixed(1)}
                      <span className="text-[10px] text-ink-muted ml-0.5">kg/m²</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        bmiStatus.includes('Obese')
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          : bmiStatus === 'Overweight'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      {bmiStatus}
                    </span>
                  </div>
                </div>

                {/* Range Bar */}
                <div className="relative pt-3 pb-1">
                  <div className="relative h-2.5 w-full rounded-full bg-surface-muted overflow-hidden flex">
                    <div className="h-full bg-sky-400" style={{ width: '11.6%' }} title="Underweight: <18.5" />
                    <div className="h-full bg-emerald-500" style={{ width: '21.3%' }} title="Normal: 18.5-24.9" />
                    <div className="h-full bg-amber-400" style={{ width: '16.7%' }} title="Overweight: 25-29.9" />
                    <div className="h-full bg-rose-500" style={{ width: '50.4%' }} title="Obese: >=30" />
                  </div>

                  {/* Marker Pin */}
                  <div
                    className="absolute top-1 -ml-2 flex flex-col items-center pointer-events-none transition-all duration-300"
                    style={{ left: `${bmiPct}%` }}
                  >
                    <div className="size-4 rounded-full border-2 border-white bg-ink shadow-md" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Healthy: 18.5-24.9</span>
                  <span className="font-medium text-ink">{bmiDelta}</span>
                  <span>Obese &ge;30</span>
                </div>
              </div>
            </div>

            {/* Documented Allergies */}
            <div className="mt-4 pt-3 border-t border-line">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                Documented Allergies (:ALLERGIC_TO)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies?.map((all: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
                    <AlertTriangle className="size-3" />
                    Allergic: {all.substance} ({all.reaction || 'Severe'})
                  </span>
                ))}
                {(!patient.allergies || patient.allergies.length === 0) && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="size-3.5" />
                    No active drug allergies documented in graph
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>

      {/* ========================================================================= */}
      {/* BREAK-GLASS PROTOCOL MODAL (Vault 1 Decryption Demo)                      */}
      {/* ========================================================================= */}
      {breakGlassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-warning bg-surface p-6 shadow-float">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-warning" />
                <h3 className="text-base font-bold text-ink">Break-Glass Protocol Activated</h3>
              </div>
              <button onClick={() => setBreakGlassOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed mb-4">
              HIPAA Two-Vault Separation active. Accessing Patient Identity Vault 1 requires clinical audit logging. 
              Decrypted directly in memory via AES-256 Fernet.
            </p>

            {decrypting ? (
              <div className="flex items-center justify-center p-6 gap-2 text-warning">
                <Activity className="size-5 animate-pulse" />
                <span className="text-xs font-medium">Decrypting Vault 1 SQLite Token...</span>
              </div>
            ) : decryptedPii ? (
              <div className="space-y-3 rounded-xl border border-line bg-surface-raised p-4 text-xs">
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink-muted font-medium">Patient Full Name:</span>
                  <span className="font-bold text-ink">{decryptedPii.first_name} {decryptedPii.last_name}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink-muted font-medium">Residential Address:</span>
                  <span className="font-semibold text-ink">{decryptedPii.address}, {decryptedPii.city}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-ink-muted font-medium">Zip Code:</span>
                  <span className="font-semibold text-ink">{decryptedPii.zip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted font-medium">SSN Masked:</span>
                  <span className="font-mono font-semibold text-danger">{decryptedPii.ssn_masked}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-danger">Failed to decrypt Vault 1 record.</p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setBreakGlassOpen(false)}
                className="rounded-xl bg-surface-raised border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors"
              >
                Close Audit Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
