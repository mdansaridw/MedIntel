import { useState, useEffect, useRef } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Dna,
  Edit3,
  FileAudio,
  FileCheck,
  Mic,
  Pill,
  Radio,
  RefreshCw,
  ShieldCheck,
  Square,
  Stethoscope,
  Upload,
  X
} from 'lucide-react'
import { MedIntelApi } from '../../../services/api'

interface ScribeStudioModalProps {
  patient: any
  isOpen: boolean
  onClose: () => void
  onEncounterCommitted: () => void
}

export function ScribeStudioModal({
  patient,
  isOpen,
  onClose,
  onEncounterCommitted
}: ScribeStudioModalProps) {
  // Presets and Input Mode
  const [presets, setPresets] = useState<any[]>([])
  const [inputMode, setInputMode] = useState<'preset' | 'mic' | 'upload' | 'text'>('preset')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_bronchitis_allergy')

  // Live Audio & Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [customDialogue, setCustomDialogue] = useState('')

  // MediaRecorder & SpeechRecognition refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const [liveTranscriptInterim, setLiveTranscriptInterim] = useState('')
  const [isLiveSttActive, setIsLiveSttActive] = useState(false)

  // Staged Draft & Processing State
  const [isProcessing, setIsProcessing] = useState(false)
  const [stagedData, setStagedData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Physician Review & Editing State
  const [editableSoap, setEditableSoap] = useState<{
    subjective: string
    objective: string
    assessment: string
    plan: string
  }>({ subjective: '', objective: '', assessment: '', plan: '' })

  const [approvedConditions, setApprovedConditions] = useState<any[]>([])
  const [approvedMedications, setApprovedMedications] = useState<any[]>([])
  const [physicianName, setPhysicianName] = useState('Dr. Gregory House, MD')
  const [physicianLicense, setPhysicianLicense] = useState('MD-74892')
  const [overrideAllergy, setOverrideAllergy] = useState(false)
  const [activeSoapTab, setActiveSoapTab] = useState<'S' | 'O' | 'A' | 'P'>('S')

  // Committing State
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<any>(null)

  // Load Presets on Mount
  useEffect(() => {
    if (isOpen) {
      MedIntelApi.getScribePresets()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPresets(data)
            setSelectedPresetId(data[0].id)
            if (inputMode === 'preset') {
              setCustomDialogue(data[0].dialogue)
            }
          }
        })
        .catch((err) => console.error('Failed to load scribe presets:', err))
    }
  }, [isOpen])

  // Sync custom dialogue when preset changes
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId)
    const found = presets.find((p) => p.id === presetId)
    if (found) {
      setCustomDialogue(found.dialogue)
    }
  }

  // Handle switching input modes without lingering preset text
  const handleSwitchMode = (mode: 'preset' | 'mic' | 'upload' | 'text') => {
    setInputMode(mode)
    setErrorMessage(null)
    if (mode === 'preset') {
      const found = presets.find((p) => p.id === selectedPresetId) || presets[0]
      if (found) {
        setCustomDialogue(found.dialogue)
      }
    } else if (mode === 'mic') {
      // Clear preset text if the current dialogue matches any preset
      const isPresetDialogue = presets.some((p) => p.dialogue.trim() === customDialogue.trim())
      if (isPresetDialogue) {
        setCustomDialogue('')
      }
    }
  }

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  // Start Mic Recording + Real-Time Live STT Streaming
  const startRecording = async () => {
    try {
      // Clean slate for recording - remove any leftover preset text
      setCustomDialogue('')
      setLiveTranscriptInterim('')
      setAudioBlob(null)
      setAudioUrl(null)
      setStagedData(null)
      setErrorMessage(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      setErrorMessage(null)
      setLiveTranscriptInterim('')

      // Initialize WebSpeech API for real-time live typing on-screen
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'

          recognition.onstart = () => {
            setIsLiveSttActive(true)
          }

          recognition.onresult = (event: any) => {
            let interim = ''
            let finalized = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const text = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finalized += text + ' '
              } else {
                interim += text
              }
            }
            if (finalized.trim()) {
              setCustomDialogue((prev) => (prev ? prev.trim() + '\n' + finalized.trim() : finalized.trim()))
            }
            setLiveTranscriptInterim(interim)
          }

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition warning:', e.error)
          }

          recognition.onend = () => {
            setIsLiveSttActive(false)
          }

          recognition.start()
          speechRecognitionRef.current = recognition
        } catch (sttErr) {
          console.warn('Browser SpeechRecognition could not be started:', sttErr)
        }
      }
    } catch (err: any) {
      console.error('Microphone access denied:', err)
      setErrorMessage('Microphone access denied. You can select a Clinical Preset or upload an audio file.')
    }
  }

  // Stop Mic Recording + Stop Live STT
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch (e) {}
      speechRecognitionRef.current = null
      setIsLiveSttActive(false)
      setLiveTranscriptInterim('')
    }
  }

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFileName(file.name)
      setAudioBlob(file)
      setAudioUrl(URL.createObjectURL(file))
      setInputMode('upload')
    }
  }

  // Run Transcription & AI Extraction (Staging only, 0 DB mutations)
  const handleProcessEncounter = async () => {
    setIsProcessing(true)
    setErrorMessage(null)
    setCommitResult(null)

    try {
      let draft: any = null

      if (audioBlob && (inputMode === 'mic' || inputMode === 'upload')) {
        const formData = new FormData()
        formData.append('patient_id', patient.id)
        formData.append('physician_name', physicianName)
        if (customDialogue.trim()) {
          formData.append('dialogue_text', customDialogue.trim())
        }
        formData.append('audio', audioBlob, uploadedFileName || 'consultation_audio.webm')
        draft = await MedIntelApi.transcribeAndExtractEncounter(formData)
      } else {
        const textToProcess = customDialogue.trim()
        draft = await MedIntelApi.transcribeAndExtractEncounter({
          patient_id: patient.id,
          dialogue_text: textToProcess,
          physician_name: physicianName
        })
      }

      if (!draft || draft.success === false) {
        setErrorMessage(draft?.error || 'No speech detected or processing failed. Please verify audio input.')
        return
      }

      if (draft.raw_transcript) {
        setCustomDialogue(draft.raw_transcript)
      }

      setStagedData(draft)
      setEditableSoap({
        subjective: draft.soap_note?.subjective || '',
        objective: draft.soap_note?.objective || '',
        assessment: draft.soap_note?.assessment || '',
        plan: draft.soap_note?.plan || ''
      })
      setApprovedConditions(draft.proposed_conditions || [])
      setApprovedMedications(draft.proposed_medications || [])
    } catch (err: any) {
      console.error('Scribe extraction failed:', err)
      setErrorMessage(err.message || 'Failed to process consultation.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Toggle Condition in Approval Checklist
  const toggleCondition = (index: number) => {
    setApprovedConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, approved: c.approved === false ? true : false } : c))
    )
  }

  // Toggle Medication in Approval Checklist
  const toggleMedication = (index: number) => {
    setApprovedMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, approved: m.approved === false ? true : false } : m))
    )
  }

  // Physician Sign-Off & Neo4j Ingestion
  const handleCommitEncounter = async () => {
    if (!stagedData) return
    setIsCommitting(true)
    setErrorMessage(null)

    const finalConditions = approvedConditions.filter((c) => c.approved !== false)
    const finalMedications = approvedMedications.filter((m) => m.approved !== false)

    try {
      const res = await MedIntelApi.commitScribeEncounter({
        patient_id: patient.id,
        physician_name: physicianName,
        physician_license: physicianLicense,
        approved_soap: editableSoap,
        approved_conditions: finalConditions,
        approved_medications: finalMedications,
        approved_vitals: stagedData.proposed_vitals,
        override_allergy_warning: overrideAllergy
      })

      setCommitResult(res)
      onEncounterCommitted()
    } catch (err: any) {
      console.error('Commit failed:', err)
      setErrorMessage(err.message || 'Physician sign-off commit was rejected by safety rules.')
    } finally {
      setIsCommitting(false)
    }
  }

  if (!isOpen) return null

  const safety = stagedData?.safety_audit
  const hasAllergyConflict = safety?.has_critical_blocker

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl border border-line bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-raised px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Ambient AI Scribe Studio</h2>
                <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-mono font-bold text-accent-strong border border-accent/30">
                  HITL Gateway · Physician Verification
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Patient: <strong className="text-ink">{patient.name}</strong> ({patient.id.slice(0, 8)}) · HIPAA Two-Vault Isolated
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-line bg-surface p-2 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Main 2-Pane Studio Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto min-h-[500px]">
          
          {/* ========================================================================= */}
          {/* LEFT PANE (5 Cols): Audio Ingestion, Presets, and Raw Dialogue            */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-line bg-surface/50 p-5 flex flex-col justify-between space-y-4 overflow-y-auto">
            <div className="space-y-4">
              
              {/* Mode Selector Tabs */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  1. Consultation Audio & Dialogue Input
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface-raised p-1 text-xs">
                  <button
                    onClick={() => handleSwitchMode('preset')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                      inputMode === 'preset' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Clinical Presets
                  </button>
                  <button
                    onClick={() => handleSwitchMode('mic')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                      inputMode === 'mic' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Mic className="size-3" /> Live Mic
                  </button>
                  <button
                    onClick={() => handleSwitchMode('upload')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                      inputMode === 'upload' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Upload className="size-3" /> File
                  </button>
                  <button
                    onClick={() => handleSwitchMode('text')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                      inputMode === 'text' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Raw Text
                  </button>
                </div>
              </div>

              {/* MODE 1: Presets */}
              {inputMode === 'preset' && (
                <div className="space-y-2">
                  <span className="text-[11px] text-ink-muted font-medium">Select a Realistic Consultation Preset:</span>
                  <div className="space-y-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                          selectedPresetId === preset.id
                            ? 'border-accent bg-accent-soft/30 text-ink shadow-sm'
                            : 'border-line bg-surface hover:border-line-strong text-ink-muted hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-ink">
                          <span>{preset.title}</span>
                          <span className="text-[10px] text-accent font-mono">{preset.audio_duration_sec}s audio</span>
                        </div>
                        <p className="text-[11px] text-ink-muted line-clamp-2">{preset.dialogue}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODE 2: Live Mic Recording */}
              {inputMode === 'mic' && (
                <div className="rounded-2xl border border-line bg-surface p-5 text-center space-y-4">
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className={`size-16 rounded-full flex items-center justify-center transition-all ${
                        isRecording ? 'bg-danger/20 text-danger border-2 border-danger animate-pulse' : 'bg-surface-raised border border-line text-ink-muted'
                      }`}
                    >
                      <Mic className="size-8" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-xs font-mono font-bold text-ink">
                        {isRecording ? `Recording: ${recordingSeconds}s` : audioBlob ? 'Recording captured' : 'Microphone Ready'}
                      </span>
                      {isLiveSttActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/20 text-danger font-semibold animate-pulse">
                          STT Streaming
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white hover:bg-danger/90 transition-all shadow-sm"
                      >
                        <Mic className="size-3.5" /> Start Ambient Capture
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 rounded-xl bg-surface-raised border border-line px-4 py-2 text-xs font-bold text-danger hover:bg-surface-muted transition-all shadow-sm"
                      >
                        <Square className="size-3.5 fill-current" /> Stop & Process
                      </button>
                    )}
                  </div>

                  {/* Live Streaming Speech Bubble */}
                  {isRecording && (
                    <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-left space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-danger text-[11px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Radio className="size-3.5 animate-pulse" />
                          Live Streaming STT (Listening...)
                        </span>
                        <span className="font-mono text-[10px] text-danger/80">0-Latency WebSpeech</span>
                      </div>
                      <div className="font-mono text-ink text-xs min-h-6 leading-relaxed">
                        {liveTranscriptInterim ? (
                          <span className="text-danger font-semibold">{liveTranscriptInterim}</span>
                        ) : (
                          <span className="text-ink-muted italic">Speak clearly into your microphone; interim words will stream live into the buffer below...</span>
                        )}
                      </div>
                    </div>
                  )}

                  {audioUrl && (
                    <audio src={audioUrl} controls className="w-full h-8 mt-2" />
                  )}
                </div>
              )}

              {/* MODE 3: Upload Audio File */}
              {inputMode === 'upload' && (
                <div className="rounded-2xl border border-line bg-surface p-5 text-center space-y-3">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-line hover:border-accent rounded-xl p-6 cursor-pointer transition-colors">
                    <FileAudio className="size-8 text-accent mb-2" />
                    <span className="text-xs font-bold text-ink">
                      {uploadedFileName || 'Choose Consultation Audio'}
                    </span>
                    <span className="text-[10px] text-ink-muted mt-1">.wav, .mp3, .m4a, .webm</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {audioUrl && <audio src={audioUrl} controls className="w-full h-8 mt-2" />}
                </div>
              )}

              {/* MODE 4: Text Dialogue Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-muted block">
                  Transcript Buffer (Doctor / Patient Verbal Dialogue):
                </label>
                <textarea
                  rows={inputMode === 'preset' ? 5 : 8}
                  value={customDialogue}
                  onChange={(e) => setCustomDialogue(e.target.value)}
                  placeholder="Doctor: Good morning Ali...&#10;Patient: Hi doctor, I have a persistent cough..."
                  className="w-full rounded-xl border border-line bg-surface p-3 text-xs font-mono text-ink placeholder:text-ink-muted outline-none focus:border-accent"
                />
              </div>

            </div>

            {/* Stage / Transcribe Action Button */}
            <div className="pt-4 border-t border-line">
              <button
                onClick={handleProcessEncounter}
                disabled={isProcessing || isRecording}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-bold text-white hover:bg-accent-strong transition-all shadow-card disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Activity className="size-4 animate-spin" />
                    <span>Extracting Clinical Entities via Scribe Engine...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="size-4" />
                    <span>2. Generate Staged SOAP Draft for Review</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-ink-muted text-center mt-2">
                🔒 Safe Harbor Gateway: Raw audio is de-identified. No data is stored in Neo4j without your sign-off.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT PANE (7 Cols): Physician Review & Staging Approval Gateway           */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-5 overflow-y-auto bg-surface-raised/40">
            
            {/* If no draft generated yet */}
            {!stagedData && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-ink-muted space-y-3">
                <FileCheck className="size-12 text-line-strong" />
                <h3 className="text-sm font-bold text-ink">Physician Review Staging Gateway</h3>
                <p className="text-xs max-w-md text-ink-muted">
                  Generate a draft from the left panel to review SOAP documentation, verify extracted diagnoses, and approve medication prescriptions before database commit.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-ink-muted space-y-3">
                <RefreshCw className="size-10 text-accent animate-spin" />
                <h3 className="text-sm font-bold text-ink">Scribe Engine Analyzing Consultation</h3>
                <p className="text-xs max-w-sm text-ink-muted">
                  Performing speaker diarization, structuring SOAP note, cross-checking allergies and pharmacy inventory in Neo4j Aura...
                </p>
              </div>
            )}

            {/* STAGED DRAFT READY FOR REVIEW */}
            {stagedData && (
              <div className="space-y-5">
                
                {/* Pre-Commit Safety Banner */}
                {hasAllergyConflict ? (
                  <div className="rounded-2xl border border-danger/60 bg-danger/10 p-4 text-xs space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-danger font-bold">
                      <AlertOctagon className="size-4" />
                      <span>CRITICAL PRE-COMMIT SAFETY WARNING: ALLERGY CONTRAINDICATION DETECTED</span>
                    </div>
                    {safety.allergy_alerts.map((alert: any, idx: number) => (
                      <p key={idx} className="text-ink text-[11px] leading-relaxed">
                        • Prescription <strong className="text-danger">{alert.drug_name}</strong> conflicts with patient's documented <strong>{alert.allergen}</strong> allergy ({alert.severity}). Reaction: <em>{alert.reaction}</em>.
                      </p>
                    ))}
                    <div className="pt-2 border-t border-danger/30 flex items-center justify-between">
                      <span className="text-[10px] text-danger font-semibold">Requires explicit physician override to commit.</span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-danger">
                        <input
                          type="checkbox"
                          checked={overrideAllergy}
                          onChange={(e) => setOverrideAllergy(e.target.checked)}
                          className="size-4 rounded border-danger accent-danger"
                        />
                        <span>Authorize Clinical Override</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-success/30 bg-success/10 p-3 text-xs flex items-center justify-between text-success">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldCheck className="size-4" />
                      <span>Allergy & Formulary Pre-Check Passed: Zero active contraindications detected in Neo4j.</span>
                    </div>
                    <span className="text-[10px] font-mono bg-success/20 px-2 py-0.5 rounded font-bold">CLEARED</span>
                  </div>
                )}

                {/* Section A: Editable SOAP Note */}
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <Edit3 className="size-4 text-accent" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                        Review & Edit Clinical SOAP Note
                      </h4>
                    </div>
                    <div className="flex gap-1">
                      {(['S', 'O', 'A', 'P'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveSoapTab(tab)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            activeSoapTab === tab
                              ? 'bg-accent text-white shadow-sm'
                              : 'text-ink-muted hover:text-ink bg-surface-raised border border-line'
                          }`}
                        >
                          {tab === 'S' && 'Subjective'}
                          {tab === 'O' && 'Objective'}
                          {tab === 'A' && 'Assessment'}
                          {tab === 'P' && 'Plan'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeSoapTab === 'S' && (
                    <div>
                      <label className="text-[10px] text-ink-muted uppercase font-bold block mb-1">
                        Subjective (Chief Complaint & HPI):
                      </label>
                      <textarea
                        rows={4}
                        value={editableSoap.subjective}
                        onChange={(e) => setEditableSoap({ ...editableSoap, subjective: e.target.value })}
                        className="w-full rounded-xl border border-line bg-surface-raised p-2.5 text-xs text-ink outline-none focus:border-accent leading-relaxed"
                      />
                    </div>
                  )}

                  {activeSoapTab === 'O' && (
                    <div>
                      <label className="text-[10px] text-ink-muted uppercase font-bold block mb-1">
                        Objective (Vitals, Physical Exam & Diagnostics):
                      </label>
                      <textarea
                        rows={4}
                        value={editableSoap.objective}
                        onChange={(e) => setEditableSoap({ ...editableSoap, objective: e.target.value })}
                        className="w-full rounded-xl border border-line bg-surface-raised p-2.5 text-xs text-ink outline-none focus:border-accent leading-relaxed"
                      />
                    </div>
                  )}

                  {activeSoapTab === 'A' && (
                    <div>
                      <label className="text-[10px] text-ink-muted uppercase font-bold block mb-1">
                        Assessment (Primary & Secondary Diagnoses):
                      </label>
                      <textarea
                        rows={4}
                        value={editableSoap.assessment}
                        onChange={(e) => setEditableSoap({ ...editableSoap, assessment: e.target.value })}
                        className="w-full rounded-xl border border-line bg-surface-raised p-2.5 text-xs text-ink outline-none focus:border-accent leading-relaxed"
                      />
                    </div>
                  )}

                  {activeSoapTab === 'P' && (
                    <div>
                      <label className="text-[10px] text-ink-muted uppercase font-bold block mb-1">
                        Plan (Pharmacotherapy, Regimen & Follow-up):
                      </label>
                      <textarea
                        rows={4}
                        value={editableSoap.plan}
                        onChange={(e) => setEditableSoap({ ...editableSoap, plan: e.target.value })}
                        className="w-full rounded-xl border border-line bg-surface-raised p-2.5 text-xs text-ink outline-none focus:border-accent leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Section B: Proposed Knowledge Graph Entities (Interactive Checklist) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Proposed Conditions */}
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                        <Dna className="size-3.5 text-accent" />
                        Diagnoses to Ingest (:Condition)
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono">{approvedConditions.length} Extracted</span>
                    </div>

                    <div className="space-y-1.5">
                      {approvedConditions.map((cond, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all text-xs ${
                            cond.approved !== false
                              ? 'border-accent/40 bg-accent-soft/20 text-ink'
                              : 'border-line bg-surface-raised opacity-50 line-through text-ink-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={cond.approved !== false}
                            onChange={() => toggleCondition(idx)}
                            className="mt-0.5 size-4 rounded border-line accent-accent"
                          />
                          <div className="flex-1">
                            <span className="font-semibold block">{cond.name}</span>
                            <span className="text-[10px] text-ink-muted font-mono">
                              SNOMED: {cond.code || 'PENDING'} · Status: {cond.clinical_status || 'active'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Proposed Prescriptions */}
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                        <Pill className="size-3.5 text-accent" />
                        Prescriptions to Ingest (:Medication)
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono">{approvedMedications.length} Extracted</span>
                    </div>

                    <div className="space-y-1.5">
                      {approvedMedications.map((med, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all text-xs ${
                            med.approved !== false
                              ? 'border-accent/40 bg-accent-soft/20 text-ink'
                              : 'border-line bg-surface-raised opacity-50 line-through text-ink-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={med.approved !== false}
                            onChange={() => toggleMedication(idx)}
                            className="mt-0.5 size-4 rounded border-line accent-accent"
                          />
                          <div className="flex-1">
                            <span className="font-semibold block">{med.name}</span>
                            <span className="text-[10px] text-ink-muted font-mono">
                              Dose: {med.dosage || 'Standard'} · {med.frequency || 'PO'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Section C: Physician Sign-Off & Verification Footer */}
                <div className="rounded-2xl border border-line bg-surface-raised p-4 shadow-card space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                        Attending Physician:
                      </label>
                      <input
                        type="text"
                        value={physicianName}
                        onChange={(e) => setPhysicianName(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                        State Medical License ID:
                      </label>
                      <input
                        type="text"
                        value={physicianLicense}
                        onChange={(e) => setPhysicianLicense(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {commitResult && (
                    <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-xs text-success flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>Encounter signed and committed to Neo4j Aura! Encounter ID: {commitResult.encounter_id}</span>
                      </div>
                      <span className="text-[10px] font-bold text-success font-mono">GRAPH UPDATED</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-ink-muted">
                      Checking items above confirms clinical validity and writes to Neo4j.
                    </span>

                    <button
                      onClick={handleCommitEncounter}
                      disabled={isCommitting || (hasAllergyConflict && !overrideAllergy)}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-accent-strong transition-all shadow-card disabled:opacity-40"
                    >
                      {isCommitting ? (
                        <>
                          <Activity className="size-3.5 animate-spin" />
                          <span>Committing to Knowledge Graph...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Sign & Commit to Knowledge Graph</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Bottom Actions if not staged */}
            {!stagedData && (
              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                >
                  Close Studio
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
