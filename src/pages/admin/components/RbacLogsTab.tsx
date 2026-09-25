import { useState } from 'react'
import {
  Check,
  Minus,
  Radio,
  ShieldCheck,
  Terminal,
  Trash2,
  Users,
} from 'lucide-react'

interface RoleDefinition {
  title: string
  description: string
  color: string
  permissions: {
    graphRead: boolean
    twinSearch: boolean
    breakGlass: boolean
    saladOverrides: boolean
    inventoryMutation: boolean
    auditExport: boolean
  }
}

const ROLES: RoleDefinition[] = [
  {
    title: 'Chief Medical Officer',
    description: 'Unrestricted clinical oversight, protocol governance, and emergency break-glass authorization.',
    color: '#34d399',
    permissions: {
      graphRead: true,
      twinSearch: true,
      breakGlass: true,
      saladOverrides: true,
      inventoryMutation: true,
      auditExport: true,
    },
  },
  {
    title: 'Attending Physician',
    description: 'Patient diagnosis, clinical consultation scribing, twin treatment matching, and justified emergency decryption.',
    color: '#579ad9',
    permissions: {
      graphRead: true,
      twinSearch: true,
      breakGlass: true,
      saladOverrides: false,
      inventoryMutation: false,
      auditExport: false,
    },
  },
  {
    title: 'Clinical Pharmacist',
    description: 'Formulary maintenance, SALAD phonetic collision management, and FDA batch recall quarantine controls.',
    color: '#f59e0b',
    permissions: {
      graphRead: true,
      twinSearch: true,
      breakGlass: false,
      saladOverrides: true,
      inventoryMutation: true,
      auditExport: false,
    },
  },
  {
    title: 'Compliance & Privacy Auditor',
    description: 'HIPAA Safe Harbor verification, Two-Vault separation monitoring, and forensic audit log review.',
    color: '#c084fc',
    permissions: {
      graphRead: false,
      twinSearch: false,
      breakGlass: false,
      saladOverrides: false,
      inventoryMutation: false,
      auditExport: true,
    },
  },
]

const INITIAL_TERMINAL_LOGS = [
  { time: '04:18:22', level: 'INFO', msg: 'Neo4j Aura Cloud DB ping: 200 OK (35.2ms latency via TLS neo4j+ssc)' },
  { time: '04:18:45', level: 'AUTH', msg: 'Identity Vault 1 verification: AES-256 Fernet symmetric key loaded in memory' },
  { time: '04:19:01', level: 'DEID', msg: 'Zero-PII Wire Guard: 1 query scrubbed on-device ([PATIENT:6095681c])' },
  { time: '04:19:15', level: 'GRAPH', msg: 'MATCH (p:Patient {id: $id})-[:DIAGNOSED_WITH]->(c:Condition) returned 4 conditions' },
  { time: '04:20:02', level: 'SALAD', msg: 'Phonetic rule evaluated: Metformin vs Metronidazole (score 0.88 >= 0.75)' },
  { time: '04:22:11', level: 'RECALL', msg: 'FDA Batch Recall monitor: Lot #RECALL-2024-001 quarantine verified active' },
  { time: '04:25:04', level: 'AUDIT', msg: 'Break-Glass forensic log updated: SHA256 integrity hash committed' },
]

export function RbacLogsTab() {
  const [terminalLogs, setTerminalLogs] = useState(INITIAL_TERMINAL_LOGS)

  return (
    <div className="space-y-6">
      {/* 1. Clinician Role & Permission Matrix */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
        <div className="flex items-center justify-between border-b border-line p-5 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <Users className="size-4.5 text-accent" />
            <div>
              <h3 className="text-sm font-bold text-ink">Role-Based Access Control (RBAC) Matrix</h3>
              <p className="text-xs text-ink-muted">Permission boundaries enforced by HIPAA Least-Privilege standard</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-[#34d399] font-medium">
            <ShieldCheck className="size-3.5" />
            <span>NIST RBAC Compliant</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted/50 text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Clinician Role</th>
                <th className="px-4 py-3 text-center">Graph Read</th>
                <th className="px-4 py-3 text-center">Twin Search</th>
                <th className="px-4 py-3 text-center">Break-Glass (Vault 1)</th>
                <th className="px-4 py-3 text-center">SALAD Overrides</th>
                <th className="px-4 py-3 text-center">Pharmacy Mutation</th>
                <th className="px-4 py-3 text-center">Audit Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROLES.map((role) => (
                <tr key={role.title} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-bold text-ink text-xs">{role.title}</span>
                    </div>
                    <span className="text-[10.5px] text-ink-muted block mt-0.5 max-w-xs">
                      {role.description}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.graphRead ? (
                      <Check className="size-4 text-[#34d399] mx-auto" />
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.twinSearch ? (
                      <Check className="size-4 text-[#34d399] mx-auto" />
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.breakGlass ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#3b2b1d] text-[#f59e0b] font-bold text-[9.5px]">
                        Authorized
                      </span>
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.saladOverrides ? (
                      <Check className="size-4 text-[#34d399] mx-auto" />
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.inventoryMutation ? (
                      <Check className="size-4 text-[#34d399] mx-auto" />
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {role.permissions.auditExport ? (
                      <Check className="size-4 text-[#34d399] mx-auto" />
                    ) : (
                      <Minus className="size-4 text-ink-muted/40 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Real-Time Terminal Activity Feed */}
      <div className="rounded-2xl border border-line bg-[#0B0F17] overflow-hidden shadow-card font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#232B38] px-4 py-3 bg-[#111622]">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-accent" />
            <span className="text-xs font-bold text-ink">Live System Security Event Stream</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#0f2824] text-[#34d399] text-[9.5px]">
              <Radio className="size-2.5 animate-pulse" /> Live
            </span>
          </div>

          <button
            type="button"
            onClick={() => setTerminalLogs([])}
            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            <Trash2 className="size-3" />
            <span>Clear</span>
          </button>
        </div>

        <div className="p-4 space-y-1.5 max-h-56 overflow-y-auto">
          {terminalLogs.length === 0 ? (
            <div className="text-ink-muted text-center py-4">Terminal buffer cleared. Listening for new graph queries...</div>
          ) : (
            terminalLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-ink-muted/60 shrink-0">[{log.time}]</span>
                <span
                  className={`font-bold shrink-0 text-[10px] px-1 py-0.2 rounded ${
                    log.level === 'AUTH'
                      ? 'bg-[#3b2b1d] text-[#f59e0b]'
                      : log.level === 'DEID'
                      ? 'bg-[#0f2824] text-[#34d399]'
                      : log.level === 'SALAD'
                      ? 'bg-[#3b1d1d] text-[#f87171]'
                      : 'bg-[#152336] text-accent'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-[#EDEFEC] break-all">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
