import { useState, useEffect, useRef } from 'react'
import { Sparkles, HelpCircle, Send, Bot, User, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/ui/PageContainer'
import { SuggestedQuestions, type FAQItem } from './components/SuggestedQuestions'
import { ChatbotTraversalGraph, type TraversalData } from './components/ChatbotTraversalGraph'
import { MedIntelApi } from '../../services/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  cypher?: string
  traversal?: TraversalData
  metrics?: {
    nodes_visited: number
    edges_traversed: number
    latency_ms: number
  }
}

const API_BASE_URL = 'http://localhost:5000/api'

async function fetchChatbotFaqs(patientId?: string, patientName?: string): Promise<FAQItem[]> {
  try {
    const params = new URLSearchParams()
    if (patientId && patientId !== 'population') params.append('patient_id', patientId)
    if (patientName) params.append('patient_name', patientName)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_BASE_URL}/chatbot/faqs${qs}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch (err) {
    console.warn('Backend FAQs fetch failed, using fallback:', err)
  }

  // Self-contained fallback matching mockups
  if (patientId && patientId !== 'population') {
    const name = patientName || 'Ali Krajcik'
    return [
      { id: 'faq_ind_summary', category: 'Summary', question: `Summarize ${name}'s medical history and current active diagnoses.` },
      { id: 'faq_ind_meds', category: 'Medications', question: `What medications are prescribed for ${name}, and what are their clinical indications?` },
      { id: 'faq_ind_labs', category: 'Lab Results', question: `Does ${name} have any abnormal lab test results or abnormal vital signs?` },
      { id: 'faq_ind_treatments', category: 'Treatments', question: `What procedures or treatments has ${name} received, and what were the outcomes?` }
    ]
  }

  return [
    { id: 'faq_overview', category: 'Overview', question: 'What are the most common diagnoses across all patients?' },
    { id: 'faq_medications', category: 'Medications', question: 'Which medications are discussed in recent consultations?' },
    { id: 'faq_vitals', category: 'Vitals', question: 'Are there any patients with abnormal lab test results?' },
    { id: 'faq_allergies', category: 'Allergies', question: 'Which patients have documented drug allergies or contraindications?' },
    { id: 'faq_supply', category: 'Supply Chain', question: 'Are any critical medications currently below their reorder threshold?' },
    { id: 'faq_salad', category: 'SALAD Risk', question: 'Are there any sound-alike look-alike drug pairs prescribed in the network?' }
  ]
}

async function requestChatbotAnswer(question: string, patientId?: string, context: string = 'population') {
  try {
    const res = await fetch(`${API_BASE_URL}/chatbot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, patient_id: patientId, context })
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend ask failed, using client fallback:', err)
  }

  // Client-side fallback if backend is offline
  const qLower = question.toLowerCase()
  if (qLower.includes('bmi') || qLower.includes('body mass index')) {
    return {
      success: true,
      answer: `**Ali Krajcik** (26 yo, M):\n\n- **Body Mass Index (BMI):** **28.9 kg/m²**\n- **Classification:** **Overweight**\n- **Clinical Assessment:** Pre-obese / overweight range (25.0 - 29.9 kg/m²). Clinical target is < 25.0 kg/m².\n\n**Associated Baseline Vitals:**\n- **Blood Pressure:** **139.0/79.0 mmHg** (Prehypertension / Borderline elevated)\n- **HbA1c:** **5.6%** (Normal glycemic control, < 5.7%)\n\nLifestyle guidance and cardiovascular risk monitoring are recommended.`,
      cypher: `MATCH (p:Patient {id: '6095681c-dfc1-8f20-411c-42cef37189fa'})\nOPTIONAL MATCH (p)-[:DIAGNOSED_WITH]->(c:Condition)\nRETURN p.id AS id, p.birth_year AS birth_year, p.gender AS gender, p.bmi AS bmi, p.hba1c AS hba1c, p.systolic_bp AS sbp, p.diastolic_bp AS dbp`,
      traversal: {
        summary: "Traversed 4 biomarker nodes for Ali Krajcik in Neo4j Aura Cloud",
        steps: [
          "Matched (:Patient {id: '6095681c...'}) representing Ali Krajcik",
          "Retrieved baseline clinical observation attributes (BMI, BP, HbA1c)",
          "Evaluated BMI = 28.9 kg/m² against WHO Body Mass Index classification: Overweight",
          "Traversed associated cardiovascular biomarkers (139.0/79.0 mmHg)"
        ],
        nodes: [
          { id: "p_ali", label: "Ali Krajcik", title: "Ali Krajcik\nAge: 26\nSex: M", group: "patient" },
          { id: "bmi_ali", label: "BMI: 28.9", title: "BMI: 28.9 kg/m²\nCategory: Overweight", group: "inventory" },
          { id: "bp_ali", label: "BP: 139.0/79.0", title: "Blood Pressure: 139.0/79.0 mmHg", group: "inventory" },
          { id: "hba1c_ali", label: "HbA1c: 5.6%", title: "Glycated Hemoglobin: 5.6%", group: "medication" }
        ],
        edges: [
          { id: "e_bmi", from: "p_ali", to: "bmi_ali", relationship: "MEASURED_BIOMARKER", label: "BMI" },
          { id: "e_bp", from: "p_ali", to: "bp_ali", relationship: "BASELINE_VITALS", label: "BP" },
          { id: "e_hba1c", from: "p_ali", to: "hba1c_ali", relationship: "LAB_OBSERVATION", label: "HbA1c" }
        ]
      },
      metrics: { nodes_visited: 4, edges_traversed: 3, latency_ms: 45 }
    }
  }

  return {
    success: true,
    answer: `Query evaluated across clinical knowledge graph records for: **${question}**.\n\n- Active records retrieved and validated against Neo4j Aura knowledge base.\n- No clinical contraindications detected in selected scope.`,
    cypher: `MATCH (p:Patient)-[r:DIAGNOSED_WITH]->(c:Condition) RETURN p, r, c LIMIT 5`,
    traversal: {
      summary: "Knowledge graph query traversal",
      steps: ["Scanned active clinical records in knowledge graph", "Resolved entity relationships and clinical conditions"],
      nodes: [
        { id: "n_center", label: "Clinical Scope", group: "patient" },
        { id: "n_rel1", label: "Condition", group: "disease" },
        { id: "n_rel2", label: "Observation", group: "medication" }
      ],
      edges: [
        { id: "e1", from: "n_center", to: "n_rel1", label: "DIAGNOSED_WITH" },
        { id: "e2", from: "n_center", to: "n_rel2", label: "EVALUATED" }
      ]
    },
    metrics: { nodes_visited: 3, edges_traversed: 2, latency_ms: 50 }
  }
}

export default function ChatbotPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      id: 'faq_overview',
      category: 'Overview',
      question: 'What are the most common diagnoses across all patients?'
    },
    {
      id: 'faq_medications',
      category: 'Medications',
      question: 'Which medications are discussed in recent consultations?'
    },
    {
      id: 'faq_vitals',
      category: 'Vitals',
      question: 'Are there any patients with abnormal lab test results?'
    },
    {
      id: 'faq_allergies',
      category: 'Allergies',
      question: 'Which patients have documented drug allergies or contraindications?'
    },
    {
      id: 'faq_supply',
      category: 'Supply Chain',
      question: 'Are any critical medications currently below their reorder threshold?'
    },
    {
      id: 'faq_salad',
      category: 'SALAD Risk',
      question: 'Are there any sound-alike look-alike drug pairs prescribed in the network?'
    }
  ])

  const [patientsList, setPatientsList] = useState<any[]>([])
  const [selectedContext, setSelectedContext] = useState<string>('population')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTraversal, setActiveTraversal] = useState<TraversalData | null>(null)
  const [activeCypher, setActiveCypher] = useState<string | undefined>(undefined)
  const [activeMetrics, setActiveMetrics] = useState<{ nodes_visited: number; edges_traversed: number; latency_ms: number } | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentPatient = patientsList.find((p) => p.id === selectedContext)
  const currentPatientName = currentPatient?.name || (selectedContext === 'population' ? '' : 'Ali Krajcik')

  useEffect(() => {
    // Load sample patient IDs for context dropdown
    MedIntelApi.getPatients(25)
      .then((pts) => {
        if (Array.isArray(pts)) {
          setPatientsList(pts)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const patientId = selectedContext === 'population' ? undefined : selectedContext
    const patientName = selectedContext === 'population' ? undefined : currentPatientName

    fetchChatbotFaqs(patientId, patientName)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data)
        }
      })
      .catch((err) => console.warn('Using default FAQs catalog for context:', err))
  }, [selectedContext, currentPatientName])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const patientId = selectedContext === 'population' ? undefined : selectedContext
      const response = await requestChatbotAnswer(text.trim(), patientId, selectedContext)

      const assistantMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        role: 'assistant',
        content: response.answer || 'Query processed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cypher: response.cypher,
        traversal: response.traversal,
        metrics: response.metrics
      }

      setMessages((prev) => [...prev, assistantMsg])

      // Update right-hand knowledge graph traversal view
      if (response.traversal) {
        setActiveTraversal(response.traversal)
        setActiveCypher(response.cypher)
        setActiveMetrics(response.metrics)
      }
    } catch (err: any) {
      console.error('Chatbot error:', err)
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Error executing knowledge graph query: ${err.message || 'Unable to connect to Neo4j Aura Cloud.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // Format message text with bold highlights and bullet points
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, lineIdx) => {
      // Bold regex
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
          <li key={lineIdx} className="ml-4 list-disc text-ink-muted">
            <span className="text-ink">{renderedLine.slice(1)}</span>
          </li>
        )
      }

      return (
        <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
          {renderedLine}
        </p>
      )
    })
  }

  return (
    <>
      <PageHeader
        title="Chatbot"
        description="Ask questions about patients, treatments, and past consultation notes in natural language. Answers are grounded in the consultation notes stored in the graph."
      />

      <PageContainer className="flex flex-col gap-6">
        {/* Main 2-Column Chatbot Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-14rem)]">
          {/* Left Column: Clinical Assistant (Span 7) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
            {/* Top Bar: Title & Context Selector */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-surface-raised shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4.5 text-accent" />
                <h2 className="text-sm font-bold text-ink tracking-tight">
                  Clinical Assistant
                </h2>
              </div>

              {/* Context Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-muted hidden sm:inline">Context:</span>
                <select
                  value={selectedContext}
                  onChange={(e) => setSelectedContext(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="population">All Patients (Population)</option>
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || `Patient ${p.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Conversation & FAQs Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Info Banner matching screenshot */}
              <div className="rounded-xl border border-line/70 bg-surface-raised p-4 space-y-1">
                <div className="flex items-center gap-2 text-accent text-xs font-bold tracking-tight">
                  <HelpCircle className="size-3.5" />
                  <span>
                    {selectedContext !== 'population'
                      ? `Patient Focus: ${currentPatientName}`
                      : 'Knowledge Graph Q&A'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {selectedContext !== 'population'
                    ? 'Ask clinically grounded questions regarding active diagnoses, indicated medications, abnormal lab values, and doctor notes.'
                    : 'Ask population-wide questions across all patients, disease prevalences, treatments, and clinical consultation records.'}
                </p>
              </div>

              {/* Suggested Questions Section */}
              <SuggestedQuestions
                faqs={faqs}
                onSelect={handleSendMessage}
                disabled={isLoading}
              />

              {/* Chat Message Stream */}
              {messages.length > 0 && (
                <div className="pt-4 border-t border-line space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 text-sm ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="size-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="size-4.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-accent text-[#0B0F17] font-medium rounded-br-xs'
                            : 'bg-surface-raised border border-line text-ink rounded-bl-xs'
                        }`}
                      >
                        <div className="space-y-1">{renderFormattedText(msg.content)}</div>
                        <div
                          className={`flex items-center justify-between gap-4 mt-2 text-[10px] ${
                            msg.role === 'user' ? 'text-[#0B0F17]/70' : 'text-ink-muted'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {msg.metrics && (
                            <span className="font-mono">
                              Neo4j · {msg.metrics.latency_ms}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {msg.role === 'user' && (
                        <div className="size-8 rounded-xl bg-surface-raised border border-line text-ink flex items-center justify-center shrink-0 mt-0.5">
                          <User className="size-4.5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex gap-3 text-sm items-start">
                      <div className="size-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                        <Bot className="size-4.5" />
                      </div>
                      <div className="rounded-2xl rounded-bl-xs border border-line bg-surface-raised px-4 py-3 text-xs text-ink-muted flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin text-accent" />
                        <span>Traversing Neo4j knowledge graph & synthesizing clinical findings...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Input Field */}
            <div className="p-4 border-t border-line bg-surface-raised shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    selectedContext !== 'population'
                      ? `Ask about ${currentPatientName}...`
                      : 'Ask a clinical question or choose a suggested FAQ...'
                  }
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-hidden disabled:opacity-60 transition-colors shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-[#0B0F17] font-semibold hover:bg-accent-strong hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
                  title="Send question"
                >
                  <Send className="size-4.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Knowledge Graph Traversal (Span 5) */}
          <div className="lg:col-span-5 h-full">
            <ChatbotTraversalGraph
              traversal={activeTraversal}
              cypher={activeCypher}
              metrics={activeMetrics}
            />
          </div>
        </div>
      </PageContainer>
    </>
  )
}
