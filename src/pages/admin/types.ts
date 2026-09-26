/**
 * Graph-wide counters. Every field is a live Cypher count from
 * `GET /api/admin/stats`. There is no `observations` field because the graph has no
 * such node label; a previously hardcoded 68,849 inflated the node total ~110x.
 */
export interface AdminCounts {
  patients: number
  conditions: number
  medications: number
  allergies: number
  pharmacy_items: number
  supply_items: number
  total_nodes: number
  total_edges: number
}

export interface AdminTelemetry {
  neo4j: {
    status: string
    uri: string
    database: string
    instance_id: string
    latency_ms: number
    pool_size: number
    encrypted_transit: boolean
  }
  vault_1: {
    name: string
    cipher: string
    key_configured: boolean
    db_mounted: boolean
    isolation_status: string
  }
  gemini_llm: {
    model: string
    status: string
    zero_pii_enforced: boolean
  }
  compliance: {
    hipaa_safe_harbor: string
    direct_pii_in_graph: number
    client_wire_guard: string
    break_glass_logging: string
  }
}

export interface AdminStatsResponse {
  timestamp: string
  status: string
  telemetry: AdminTelemetry
  counts: AdminCounts
  response_time_ms: number
}

export interface AuditLogItem {
  id: string
  timestamp: string
  type: 'BREAK_GLASS' | 'WIRE_GUARD' | 'SALAD_ALERT' | 'FDA_RECALL'
  actor: string
  role: string
  patient_id: string
  patient_label: string
  action: string
  justification: string
  status: string
  ip_address: string
  signature: string
}

export interface SaladRuleItem {
  id: string
  drug_a: string
  brand_a: string
  drug_b: string
  brand_b: string
  similarity_score: number
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE'
  indication_a: string
  indication_b: string
  warning: string
  action_required: string
  status: string
}

export interface QuarantineResponse {
  lot_number: string
  is_quarantined: boolean
  impacted_patients_count: number
  message: string
}
