# MediSynapse (AetherGraph) - API Specification & Team Contracts

This document is the **single source of truth** for Jerry, Parasu, and DarkSider.
By adhering to these JSON contracts, all 3 team members can work simultaneously with zero merge conflicts.

---

## 1. Ambient AI Scribe Module (Jerry)
**Prefix:** `/api/scribe`

### `POST /api/scribe/transcribe`
Transcribes clinical audio locally using Moonshine / Whisper.
* **Content-Type:** `multipart/form-data`
* **Body:**
  * `audio`: File (wav/mp3/webm)
  * `encounter_id` (optional): `string`
* **Response (200 OK):**
```json
{
  "encounter_id": "enc_101",
  "raw_transcript": "Patient is a 54-year-old male with persistent cough and fever for 3 days. Prescribing Amoxicillin 500mg twice daily for 7 days."
}
```

### `POST /api/scribe/process`
Takes raw transcript or audio and produces a structured SOAP note + extracted FHIR entities.
* **Content-Type:** `application/json`
* **Body:**
```json
{
  "transcript": "Patient is a 54-year-old male with persistent cough and fever for 3 days. Prescribing Amoxicillin 500mg twice daily for 7 days."
}
```
* **Response (200 OK):**
```json
{
  "soap": {
    "subjective": "54-year-old male presents with persistent cough and fever for 3 days.",
    "objective": "Lungs clear to auscultation, febrile.",
    "assessment": [
      {"condition": "Acute Bronchitis", "icd10": "J20.9", "status": "active"}
    ],
    "plan": [
      {"medication": "Amoxicillin", "dosage": "500mg", "frequency": "BID", "duration": "7 days", "rxnorm": "866514"}
    ]
  },
  "entities": {
    "conditions": [
      {"name": "Acute Bronchitis", "code": "J20.9"}
    ],
    "medications": [
      {"name": "Amoxicillin", "dosage": "500mg", "rxnorm": "866514"}
    ]
  }
}
```

---

## 2. Graph & Supply Chain Module (DarkSider)
**Prefix:** `/api/graph` & `/api/supply`

### `POST /api/graph/encounter/commit`
Commits extracted clinical entities into the Neo4j Knowledge Graph and runs automated safety/supply chain checks.
* **Content-Type:** `application/json`
* **Body:**
```json
{
  "patient_id": "urn:uuid:7f3b4819-...",
  "doctor_id": "DOC-902",
  "conditions": [
    {"name": "Acute Bronchitis", "code": "J20.9"}
  ],
  "medications": [
    {"name": "Amoxicillin", "dosage": "500mg", "rxnorm": "866514"}
  ]
}
```
* **Response (200 OK):**
```json
{
  "status": "committed",
  "encounter_id": "enc_9921",
  "safety_alerts": [
    {
      "type": "SALAD_WARNING",
      "severity": "high",
      "flagged_drug": "Amoxicillin",
      "confused_with": "Augmentin",
      "phonetic_similarity": 0.88,
      "message": "Caution: High phonetic similarity to Augmentin. Verify patient clavulanate allergy."
    },
    {
      "type": "SUPPLY_CHAIN_ALERT",
      "severity": "warning",
      "drug": "Amoxicillin 500mg",
      "current_stock": 4,
      "reorder_threshold": 10,
      "suggested_alternative": "Azithromycin 250mg"
    }
  ],
  "graph_metrics": {
    "nodes_created": 3,
    "relationships_created": 4
  }
}
```

### `GET /api/graph/patient/<patient_id>`
Returns the patient's sub-graph (for React Force Graph visualization).
* **Protected by ABAC:** Requires valid doctor token and assignment.
* **Response (200 OK):**
```json
{
  "nodes": [
    {"id": "urn:uuid:...", "label": "Patient", "title": "Patient (Age 54, Male)", "group": "patient"},
    {"id": "c_J209", "label": "Condition", "title": "Acute Bronchitis (J20.9)", "group": "condition"},
    {"id": "m_866514", "label": "Medication", "title": "Amoxicillin 500mg", "group": "medication"}
  ],
  "links": [
    {"source": "urn:uuid:...", "target": "c_J209", "label": "DIAGNOSED_WITH"},
    {"source": "urn:uuid:...", "target": "m_866514", "label": "PRESCRIBED"}
  ]
}
```

### `POST /api/graph/cohort/similar`
Vector similarity patient cohort search.
* **Body:**
```json
{
  "patient_id": "urn:uuid:7f3b4819-...",
  "top_k": 5
}
```
* **Response (200 OK):**
```json
{
  "cohorts": [
    {
      "patient_id": "urn:uuid:4812a...",
      "similarity_score": 0.94,
      "shared_conditions": ["Type 2 Diabetes", "Hypertension"],
      "effective_treatments": ["Metformin + Lisinopril"]
    }
  ]
}
```

---

## 3. Security, Tokenizer Vault & ABAC Module (Parasu)
**Prefix:** `/api/security`

### `POST /api/security/tokenize`
De-identifies PII and returns an anonymous UUID token.
* **Body:**
```json
{
  "name": "John Doe",
  "phone": "+1-555-0192",
  "birth_year": 1972,
  "gender": "male"
}
```
* **Response (200 OK):**
```json
{
  "patient_token": "urn:uuid:7f3b4819-..."
}
```

### `POST /api/security/break-glass`
Emergency override allowing temporary emergency access to patient records with a mandatory compliance log.
* **Body:**
```json
{
  "doctor_id": "DOC-902",
  "patient_id": "urn:uuid:7f3b4819-...",
  "reason": "Trauma ER admission, patient unresponsive."
}
```
* **Response (200 OK):**
```json
{
  "access_granted": true,
  "audit_event_id": "audit_88192a",
  "expires_in_minutes": 30
}
```
