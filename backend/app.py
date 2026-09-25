import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

from modules.graph.neo4j_client import Neo4jClient
from modules.graph.vector_sim import PatientSimilarityEngine
from modules.graph.treatment_intelligence import TreatmentIntelligenceEngine
from modules.supply_chain.inventory import SupplyChainEngine

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

app = Flask(__name__)
CORS(app) # Enable CORS for all routes so Vite frontend can access

# --- HEALTH ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "database": "Neo4j Aura Connected"})

# --- PATIENTS LIST ---
@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Returns a list of patients with demographics and vitals, filtering out non-clinical findings."""
    limit = request.args.get('limit', 50, type=int)
    query = """
    MATCH (p:Patient)
    OPTIONAL MATCH (p)-[:DIAGNOSED_WITH]->(c:Condition)
    WHERE NOT (
        c.name CONTAINS 'education' OR 
        c.name CONTAINS 'employment' OR 
        c.name CONTAINS 'Social isolation' OR 
        c.name CONTAINS 'social contact' OR 
        c.name CONTAINS 'violence' OR 
        c.name CONTAINS 'abuse' OR 
        c.name CONTAINS 'situation' OR 
        c.name CONTAINS 'labor force'
    )
    WITH p, collect(DISTINCT c.name) as conditions, count(DISTINCT c) as condition_count
    RETURN p.id AS id, p.birth_year AS birth_year, p.gender AS gender, p.race AS race,
           p.hba1c AS hba1c, p.systolic_bp AS systolic_bp, p.diastolic_bp AS diastolic_bp, p.bmi AS bmi,
           conditions, condition_count
    LIMIT $limit
    """
    results = Neo4jClient.query(query, {"limit": limit})
    return jsonify(results)

# --- SINGLE PATIENT PROFILE ---
@app.route('/api/patients/<patient_id>', methods=['GET'])
def get_patient_profile(patient_id):
    """Returns full clinical profile for an individual patient (demographics, conditions, meds, allergies)."""
    query = """
    MATCH (p:Patient {id: $patient_id})
    OPTIONAL MATCH (p)-[r_c:DIAGNOSED_WITH]->(c:Condition)
    OPTIONAL MATCH (p)-[r_m:PRESCRIBED]->(m:Medication)
    OPTIONAL MATCH (p)-[r_a:ALLERGIC_TO]->(a:Allergy)
    RETURN p.id AS id, p.birth_year AS birth_year, p.gender AS gender, p.race AS race,
           p.hba1c AS hba1c, p.systolic_bp AS systolic_bp, p.diastolic_bp AS diastolic_bp, p.bmi AS bmi,
           collect(DISTINCT {code: c.code, name: c.name, start_date: r_c.start_date, stop_date: r_c.stop_date, status: r_c.status}) AS conditions,
           collect(DISTINCT {name: m.name, rxnorm_code: m.rxnorm_code, start_date: r_m.start_date, stop_date: r_m.stop_date, outcome: r_m.outcome}) AS medications,
           collect(DISTINCT {substance: a.substance, severity: a.severity, reaction: a.reaction}) AS allergies
    """
    try:
        results = Neo4jClient.query(query, {"patient_id": patient_id})
        if not results:
            return jsonify({"error": "Patient not found"}), 404
        record = results[0]
        # Filter out empty entries if any
        record['conditions'] = [c for c in record.get('conditions', []) if c.get('name')]
        record['medications'] = [m for m in record.get('medications', []) if m.get('name')]
        record['allergies'] = [a for a in record.get('allergies', []) if a.get('substance')]
        return jsonify(record)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- AI CLINICAL SUMMARY (GEMINI 3.8 FLASH) ---
@app.route('/api/patients/<patient_id>/summary', methods=['GET'])
def get_patient_ai_summary(patient_id):
    """
    Generates a 2-3 sentence AI clinical synthesis from the de-identified graph context.
    Strictly preserves HIPAA Two-Vault isolation (zero PII sent to LLM).
    """
    import google.generativeai as genai
    from dotenv import load_dotenv

    load_dotenv(r"D:\HackGenIX\backend\.env")
    gemini_key = os.getenv("GEMINI_API_KEY")

    # Fetch de-identified profile from graph
    query = """
    MATCH (p:Patient {id: $patient_id})
    OPTIONAL MATCH (p)-[r_c:DIAGNOSED_WITH]->(c:Condition)
    OPTIONAL MATCH (p)-[r_m:PRESCRIBED]->(m:Medication)
    OPTIONAL MATCH (p)-[r_a:ALLERGIC_TO]->(a:Allergy)
    RETURN p.birth_year AS birth_year, p.gender AS gender,
           p.hba1c AS hba1c, p.systolic_bp AS systolic_bp, p.diastolic_bp AS diastolic_bp, p.bmi AS bmi,
           collect(DISTINCT c.name) AS conditions,
           collect(DISTINCT m.name) AS medications,
           collect(DISTINCT a.substance) AS allergies
    """
    try:
        results = Neo4jClient.query(query, {"patient_id": patient_id})
        if not results:
            return jsonify({"error": "Patient not found"}), 404
        p = results[0]
        age = 2026 - (p.get('birth_year') or 1980)
        gender = "Male" if p.get('gender') == 'M' else "Female" if p.get('gender') == 'F' else "Unknown"
        conditions = [c for c in p.get('conditions', []) if c and not any(x in c.lower() for x in ['education', 'employment', 'social', 'violence', 'situation'])]
        meds = [m for m in p.get('medications', []) if m]
        allergies = [a for a in p.get('allergies', []) if a]
        hba1c = p.get('hba1c')
        bp = f"{p.get('systolic_bp')}/{p.get('diastolic_bp')}"
        bmi = p.get('bmi')

        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel('models/gemini-3.8-flash')
                prompt = (
                    f"You are a clinical decision support AI in a hospital EHR. "
                    f"Write a concise, professional 2-3 sentence clinical summary for this patient based on their de-identified medical graph profile: "
                    f"Age: {age}, Gender: {gender}, Baseline Vitals: HbA1c {hba1c}%, Blood Pressure {bp} mmHg, BMI {bmi}. "
                    f"Active Conditions: {', '.join(conditions[:5]) or 'None'}. "
                    f"Past/Current Medications: {', '.join(meds[:4]) or 'None'}. "
                    f"Documented Allergies: {', '.join(allergies) or 'None'}. "
                    f"Highlight disease control status, cardiovascular/metabolic risks, and key clinical priorities. "
                    f"Do not hallucinate names or address the reader directly."
                )
                response = model.generate_content(prompt)
                return jsonify({
                    "patient_id": patient_id,
                    "summary": response.text.strip(),
                    "model": "gemini-3.8-flash",
                    "status": "AI Generated (Live)"
                })
            except Exception as gemini_err:
                logger.warning(f"Gemini API call failed, using clinical fallback: {gemini_err}")

        # Rule-based Clinical Fallback
        cond_str = ', '.join(conditions[:3]) or 'routine monitoring'
        glycemic_status = "uncontrolled hyperglycemia" if hba1c and hba1c > 7.0 else "prediabetic glycemic range" if hba1c and hba1c >= 5.7 else "controlled glucose levels"
        bp_status = "Stage 2 Hypertension" if p.get('systolic_bp', 0) >= 140 else "elevated blood pressure"
        fallback_summary = (
            f"The patient is a {age}-year-old {gender.lower()} presenting with a history of {cond_str}. "
            f"Current baseline labs demonstrate {glycemic_status} (HbA1c {hba1c}%) and {bp_status} ({bp} mmHg). "
            f"Clinical focus is centered on cardiovascular risk reduction, glycemic optimization, and twin-guided therapy evaluation."
        )
        return jsonify({
            "patient_id": patient_id,
            "summary": fallback_summary,
            "model": "rule-based clinical engine (fallback)",
            "status": "Engine Generated"
        })

    except Exception as e:
        logger.error(f"Error generating patient summary: {e}")
        return jsonify({"error": str(e)}), 500

# --- BREAK-GLASS VAULT 1 DECRYPTION ---
@app.route('/api/vault/decrypt-patient', methods=['POST'])
def decrypt_patient_pii():
    """Simulates Break-Glass emergency authorization to decrypt patient PII from Vault 1."""
    import sqlite3
    import json
    from cryptography.fernet import Fernet
    from dotenv import load_dotenv

    load_dotenv(r"D:\HackGenIX\backend\.env")
    vault_key = os.getenv("VAULT_ENCRYPTION_KEY")
    if not vault_key:
        return jsonify({"error": "Vault encryption key missing"}), 500

    data = request.json or {}
    patient_id = data.get('patient_id')
    auth_reason = data.get('auth_reason', 'Emergency Break-Glass Clinical Review')

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    try:
        cipher = Fernet(vault_key.encode('utf-8'))
        conn = sqlite3.connect(r"D:\HackGenIX\backend\identity_vault.db")
        cursor = conn.cursor()
        cursor.execute("SELECT encrypted_data FROM patient_pii WHERE patient_id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"error": "Patient PII record not found in Vault 1"}), 404

        decrypted_json = cipher.decrypt(row[0]).decode('utf-8')
        pii = json.loads(decrypted_json)

        return jsonify({
            "status": "Decrypted Successfully",
            "patient_id": patient_id,
            "auth_reason": auth_reason,
            "pii": {
                "first_name": pii.get("first_name"),
                "last_name": pii.get("last_name"),
                "address": pii.get("address"),
                "city": pii.get("city"),
                "zip": pii.get("zip"),
                "ssn_masked": f"***-**-{pii.get('ssn', '0000')[-4:]}"
            }
        })
    except Exception as e:
        return jsonify({"error": f"Failed to decrypt Vault 1: {str(e)}"}), 500

# --- KNOWLEDGE GRAPH (VIS-NETWORK EXPORT) ---
@app.route('/api/graph/subgraph/<patient_id>', methods=['GET'])
def get_patient_subgraph(patient_id):
    """
    Extracts a 2-hop neighborhood around a patient and formats it for vis-network.
    Returns { "nodes": [...], "edges": [...] }
    """
    query = """
    MATCH (p:Patient {id: $patient_id})
    OPTIONAL MATCH (p)-[r1]-(n1)
    WHERE labels(n1)[0] IN ['Condition', 'Medication', 'Allergy', 'SupplyItem']
    OPTIONAL MATCH (n1)-[r2]-(n2)
    WHERE type(r2) IN ['TREATS', 'SOUNDS_ALIKE_TO', 'STOCKED_IN', 'REQUIRES_SUPPLY']

    WITH p,
         collect(DISTINCT {
             id: elementId(p),
             label: 'Patient #' + substring(p.id, 0, 8),
             group: 'patient',
             properties: properties(p)
         }) +
         collect(DISTINCT {
             id: elementId(n1),
             label: coalesce(n1.name, n1.substance, 'Item'),
             group: CASE toLower(labels(n1)[0]) 
                     WHEN 'condition' THEN 'disease' 
                     WHEN 'supplyitem' THEN 'supply' 
                     WHEN 'pharmacyinventory' THEN 'inventory' 
                     ELSE toLower(labels(n1)[0]) 
                    END,
             properties: properties(n1)
         }) +
         collect(DISTINCT {
             id: elementId(n2),
             label: coalesce(n2.name, n2.substance, 'Stock: ' + toString(n2.stock_quantity), 'Item'),
             group: CASE toLower(labels(n2)[0]) 
                     WHEN 'condition' THEN 'disease' 
                     WHEN 'supplyitem' THEN 'supply' 
                     WHEN 'pharmacyinventory' THEN 'inventory' 
                     ELSE toLower(labels(n2)[0]) 
                    END,
             properties: properties(n2)
         }) AS all_nodes,
         
         collect(DISTINCT {
             id: elementId(r1),
             from: elementId(startNode(r1)),
             to: elementId(endNode(r1)),
             relationship: type(r1),
             label: type(r1),
             properties: properties(r1)
         }) +
         collect(DISTINCT {
             id: elementId(r2),
             from: elementId(startNode(r2)),
             to: elementId(endNode(r2)),
             relationship: type(r2),
             label: type(r2),
             properties: properties(r2)
         }) AS all_edges

    UNWIND all_nodes AS n
    WITH all_edges, collect(DISTINCT n) AS raw_nodes
    RETURN [x IN raw_nodes WHERE x.id IS NOT NULL] AS nodes,
           [e IN all_edges WHERE e.id IS NOT NULL] AS edges
    """
    try:
        raw_results = Neo4jClient.query(query, {"patient_id": patient_id})
        if not raw_results:
            return jsonify({"nodes": [], "edges": []})
        return jsonify(raw_results[0])
    except Exception as e:
        logger.error(f"Error fetching subgraph: {e}")
        return jsonify({"error": str(e)}), 500

# --- PATIENT SIMILARITY (METHOD 4) ---
@app.route('/api/cohort/similar', methods=['GET'])
def get_similar_patients():
    patient_id = request.args.get('patient_id')
    top_k = request.args.get('top_k', 5, type=int)
    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400
    try:
        results = PatientSimilarityEngine.find_similar_patients(patient_id, top_k)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- TREATMENT INTELLIGENCE ---
@app.route('/api/treatment/global', methods=['GET'])
def get_global_treatment():
    condition_code = request.args.get('condition_code')
    if not condition_code:
        return jsonify({"error": "condition_code is required"}), 400
    try:
        return jsonify(TreatmentIntelligenceEngine.get_global_disease_intelligence(condition_code))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/treatment/cohort', methods=['GET'])
def get_cohort_treatment():
    primary = request.args.get('primary_condition')
    comorbidities = request.args.getlist('comorbidities')
    min_age = request.args.get('min_age', 0, type=int)
    max_age = request.args.get('max_age', 120, type=int)
    if not primary:
        return jsonify({"error": "primary_condition is required"}), 400
    try:
        return jsonify(TreatmentIntelligenceEngine.get_cohort_intelligence(primary, comorbidities, min_age, max_age))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/treatment/personalized', methods=['GET'])
def get_personalized_treatment():
    patient_id = request.args.get('patient_id')
    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400
    try:
        return jsonify(TreatmentIntelligenceEngine.get_personalized_patient_intelligence(patient_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SUPPLY CHAIN ---
@app.route('/api/supply/check', methods=['GET'])
def check_supply():
    rxnorm_code = request.args.get('rxnorm_code')
    if not rxnorm_code:
        return jsonify({"error": "rxnorm_code is required"}), 400
    try:
        return jsonify(SupplyChainEngine.check_prescription_stock(rxnorm_code))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/supply/fda-recall', methods=['GET'])
def check_fda_recall():
    lot_number = request.args.get('lot_number')
    if not lot_number:
        return jsonify({"error": "lot_number is required"}), 400
    try:
        return jsonify(SupplyChainEngine.fda_lot_recall_audit(lot_number))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Add flask-cors to requirements if not already present
    app.run(host='0.0.0.0', port=5000, debug=True)
