# MediSynapse (AetherGraph) - Master Architectural Decisions & Specifications

> **RULE:** This document is the strict contract and source of truth for the entire hackathon. 
> Before proposing or implementing any code, the agent MUST review and follow these specifications. No deviations allowed without explicit user consent.

---

## 1. Project Identity & Team
* **Project Name:** MediSynapse (AetherGraph)
* **Goal:** A FHIR-native, privacy-preserving Clinical Knowledge Graph platform featuring Ambient Scribing, Hybrid GraphRAG, Treatment Intelligence, and Supply Chain tracking.
* **Team & Ownership:**
  * **DarkSider (User):** Backend, Neo4j Graph DB, Hybrid Vector Similarity, Treatment Intelligence, Supply Chain integration.
  * **Jerry:** Ambient AI Scribe (Audio STT via Moonshine/Whisper, Clinical NER, SOAP generation, FHIR JSON extraction).
  * **Parasu:** Frontend (React + TSX + Tailwind + Graph Visualizer) & Security (ABAC middleware, Tokenization Vault UI).

---

## 2. Core Security & Privacy Model (HIPAA Two-Vault Separation)

### Vault 1: Identity Tokenizer Vault (Encrypted SQLite)
* **Storage:** `backend/identity_vault.db` (AES-256 Fernet encrypted).
* **Contains ONLY direct PII:** `patient_id` (UUID), encrypted blob containing `first_name`, `last_name`, `ssn`, `address`, `city`, `zip`.
* **Key Management:** `VAULT_ENCRYPTION_KEY` kept in `backend/.env`, never stored in databases.

### Vault 2: Clinical Knowledge Graph (Neo4j Aura Cloud)
* **ZERO PII:** No names, no SSNs, no street addresses, no phone numbers.
* **Contains only:** Anonymous `Patient.id` (UUID), `birth_year` (safe under HIPAA Safe Harbor), `gender`, `race`, `ethnicity`, `income`.
* **External AI / Chatbot / LLM Rule:** No direct patient identifiers are EVER sent to external LLMs. LLMs receive only de-identified clinical subgraphs (age, conditions, allergies, vitals). Real names are attached locally in server memory only for authorized UI views.

---

## 3. Dataset & Ingestion Specifications (Synthea)

The graph MUST ingest from `data/raw/csv/` using batch transactions:

1. **`patients.csv`**:
   * PII (`FIRST`, `LAST`, `SSN`, `ADDRESS`) $\rightarrow$ Encrypted into `identity_vault.db`.
   * Demographics (`id`, `birth_year`, `gender`, `race`, `ethnicity`, `income`) $\rightarrow$ `(:Patient)` node.
2. **`conditions.csv`**:
   * Nodes: `(:Condition {code, name, system})`.
   * Edges: `(p:Patient)-[:DIAGNOSED_WITH {start_date, stop_date, status: 'active'|'resolved'}]->(c:Condition)`.
3. **`medications.csv`**:
   * Nodes: `(:Medication {rxnorm_code, name, metaphone})`.
   * Edges: `(p:Patient)-[:PRESCRIBED {start_date, stop_date, outcome: 'RESOLVED'|'ONGOING'}]->(m:Medication)`.
   * Semantic Edges: `(m:Medication)-[:TREATS]->(c:Condition)` derived from `REASONCODE` and `REASONDESCRIPTION`.
4. **`observations.csv` (MANDATORY FOR BIOMARKERS):**
   * Filtered for core clinical vitals:
     * HbA1c (`4548-4`)
     * Systolic BP (`8480-6`)
     * Diastolic BP (`8462-4`)
     * BMI (`39156-5`)
   * Stored on Patient as latest baseline metrics or `(:Observation)` nodes for computing patient similarity and treatment improvement deltas.
5. **`allergies.csv`**:
   * Nodes: `(:Allergy {substance, severity, reaction})`.
   * Edges: `(p:Patient)-[:ALLERGIC_TO]->(a:Allergy)` for critical contraindication checks.
6. **`supplies.csv`**:
   * Nodes: `(:SupplyItem {code, name, category})`.
   * Edges: `(m:Medication)-[:REQUIRES_SUPPLY]->(s:SupplyItem)` (e.g. Insulin $\rightarrow$ Glucose strips).
7. **Supply Chain & Inventory**:
   * Nodes: `(:PharmacyInventory {sku, item_name, stock_quantity, reorder_threshold, lot_number, expiry_date})`.
   * Edges: `(m:Medication)-[:STOCKED_IN]->(inv:PharmacyInventory)`.
8. **SALAD (Sound-Alike Look-Alike Drugs)**:
   * Edges: `(m1:Medication)-[:SOUNDS_ALIKE_TO {similarity_score, risk_level, warning}]->(m2:Medication)`.
   * Generated using Double Metaphone phonetic matching + Levenshtein distance on drug brand names.

---

## 4. Patient Similarity Specifications (The Agreed Formula)

**Method 4: Graph-Pruned Weighted Cosine Similarity** MUST be strictly implemented:

$$\text{Similarity}(P_1, P_2) = w_{\text{cond}} \cdot \text{Jaccard}_{\text{conditions}} + w_{\text{bio}} \cdot \text{Sim}_{\text{biomarkers}} + w_{\text{demo}} \cdot \text{Sim}_{\text{demo}}$$

### Strict Weights:
* **$w_{\text{cond}} = 0.50$ (Disease Overlap):**
  $$\text{Jaccard}_{\text{conditions}} = \frac{|C(P_1) \cap C(P_2)|}{|C(P_1) \cup C(P_2)|}$$
* **$w_{\text{bio}} = 0.35$ (Biomarker Closeness):**
  Normalized Euclidean/Cosine distance on:
  * Normalized HbA1c (scale 4.0 - 14.0)
  * Normalized Systolic BP (scale 80 - 200)
  * Normalized Diastolic BP (scale 50 - 130)
  * Normalized BMI (scale 15 - 50)
* **$w_{\text{demo}} = 0.15$ (Demographics Match):**
  * Age proximity: $1.0 - \frac{|\text{age}_1 - \text{age}_2|}{100}$ (10% weight)
  * Gender match: $1.0$ if identical, $0.0$ if different (5% weight)

---

## 5. Treatment Intelligence Specifications (3-Level Hierarchy)

1. **Level 1: Global Disease Intelligence (Macro / Population)**
   * Query: Historical efficacy rate of all medications prescribed for a condition:
     $$\text{Efficacy Rate} = \frac{\text{Count}(\text{outcome} = 'RESOLVED')}{\text{Total Prescriptions}}$$
2. **Level 2: Cohort-Level Intelligence (Comorbidities & Demographics)**
   * Query: Best treatments for specific patient sub-populations (e.g. Age 50-65 with BOTH Diabetes AND Hypertension).
3. **Level 3: Personalized Patient Intelligence (Micro / Individual)**
   * Find Top $K$ similar patient twins using the Formula above.
   * Collect their effective treatments.
   * **Filter out any drug conflicting with the target patient's `(:Allergy)` nodes.**
   * **Filter out or flag any drug with a `[:SOUNDS_ALIKE_TO]` SALAD warning.**
   * **Cross-check `(:PharmacyInventory)`:** If recommended drug is out of stock, surface the in-stock alternative.

---

## 6. Supply Chain Features
1. **Real-time stock level & low-stock warning** at point of prescription.
2. **Coupled companion supply check** (e.g. Insulin $\rightarrow$ Glucose strips from `supplies.csv`).
3. **1-Hop FDA Batch Recall audit query** (`MATCH (inv:PharmacyInventory {lot_number: $lot})<-...-(p:Patient)`).

---

## 7. Patient Directory Page Specification (`/patients`)

The patient directory serves as a clean, high-performance triage portal without visual clutter.

* **Overview Card Contents:**
  * **Identity & Vault Status:** Anonymous ID `Patient #<uuid-prefix>` + `Vault 1 (AES-256 Protected)` badge.
  * **Demographics:** Age (derived from `birth_year`), Gender, Race.
  * **Condition Badges:** Pill tags for diagnosed conditions (e.g., `Type 2 Diabetes`, `Hypertension`) with `+N more` counter.
  * **Clinical Load:** Diagnosed conditions count + Total prescriptions on record.
  * **NO Biomarkers / Lab tests on cards:** Kept strictly inside the individual patient workspace to prevent clutter.
  * **Action Button:** `Check Patient →` (navigates to `/patients/:patientId`).
* **Header Controls:**
  * Real-time search filter by Patient ID.
  * Filter by Condition and Gender.
  * Total graph record counter.

---

## 8. Patient Clinical Workspace Specification (`/patients/:patientId` - Bento Grid)

When a physician clicks `Check Patient`, they enter a unified **Command Center (Bento Grid Layout)** containing 6 coordinated modules:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: Identity & Break-Glass Decryption Banner                              │
│ • Anonymous ID, Age, Gender, Race                                             │
│ • Vault 1 "Break-Glass Protocol" Button (prompts doctor auth, decrypts PII)   │
├──────────────────────────────────────┬────────────────────────────────────────┤
│ ZONE 2: Ambient AI Scribe (Jerry)    │ ZONE 3: Patient Subgraph (Obsidian)    │
│ • Audio recording waveform & toggle  │ • vis-network Obsidian dark canvas     │
│ • Live consultation transcript       │ • Centered on patient 2-hop ecosystem  │
│ • Auto-generated SOAP note draft     │ • Visible SALAD & Allergy conflict     │
│ • "Sync to Graph" action trigger     │   warning edges + Zoom LOD             │
├──────────────────────────────────────┴────────────────────────────────────────┤
│ ZONE 4: Method 4 Clinical Twins (Similar Patients)                            │
│ • Top 3-5 twin patients ranked by the 50/35/15 formula                        │
│ • Mathematical breakdown radar (50% Jaccard | 35% Biomarkers | 15% Demographics)│
│ • "What worked for twins" (Efficacy % + Pharmacy shelf stock check)           │
├──────────────────────────────────────┬────────────────────────────────────────┤
│ ZONE 5: Medical History & Timeline   │ ZONE 6: Labs & Biomarker Trajectory    │
│ • Chronological timeline of diagnoses│ • HbA1c gauge with clinical thresholds │
│ • Prescriptions with outcome status  │ • Systolic/Diastolic BP gauge & stage  │
│   (RESOLVED vs ACTIVE)               │ • BMI status (Normal / Overweight)     │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

* **Module 1: Identity & Break-Glass Decryption:**
  * Displays de-identified profile.
  * Has a simulated "Break-Glass Protocol" button. When triggered, it queries Vault 1 (SQLite) with the AES-256 key and displays the decrypted name, phone, and address in a secure modal.
* **Module 2: Ambient AI Scribe (Jerry's UI):**
  * Interactive audio recording simulator with pulsating waveform.
  * Dialogue transcript between Doctor & Patient.
  * Structured SOAP note view (Subjective, Objective, Assessment, Plan).
  * 1-Click "Extract to Graph" button.
* **Module 3: Obsidian Patient Subgraph:**
  * Visualizes the patient's immediate 2-hop neighborhood.
  * Includes the Obsidian fluid physics, dynamic zoom LOD, and context drawer for node/edge clicks.
  * SALAD phonetic warning edges highlighted with dashed amber hazard styling.
* **Module 4: Method 4 Clinical Twins:**
  * Shows the top matching twins from the graph.
  * Displays percentage contributions: Jaccard (50%), Biomarkers (35%), Demographics (15%).
  * Lists treatments that cured those twins, cross-referenced with pharmacy stock.
* **Module 5: Longitudinal History & Timeline:**
  * Chronological record of diagnoses, medication start/stop dates, and clinical outcomes (`RESOLVED` vs `ACTIVE`).
* **Module 6: Dedicated Labs & Biomarkers:**
  * Dedicated panel for HbA1c, BP, and BMI with clinical reference range indicators.

---

## 9. Mandatory Engineering Workflow Protocol

For EVERY page, feature, or subsystem, the team and agent MUST strictly adhere to this 4-step sequence:

1. **Step 1: Discuss & Research:**
   * Research clinical relevance, UX behavior, data dependencies, and failure modes.
   * Propose the exact components, data flow, and visual structure.
2. **Step 2: Review with User:**
   * Ground decisions in this specification document (`docs/DECISIONS_AND_SPECS.md`).
   * Iterate and get user alignment before writing implementation code.
3. **Step 3: Build & Integrate:**
   * Implement backend endpoints, frontend components, and styling.
   * Ensure Zero TypeScript errors (`npm run build`) and clean API responses.
4. **Step 4: End-to-End Self-Testing & User Testing Guide:**
   * Agent MUST self-test all endpoints and UI flows with automated tools/curl/scripts before declaring completion.
   * Provide the user with exact step-by-step instructions on how to test every single implemented feature in their browser and terminal.


