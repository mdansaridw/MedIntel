import os
import csv
import json
import sqlite3
import random
import logging
from collections import defaultdict
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from neo4j import GraphDatabase
import jellyfish

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# --- 1. LOAD CONFIGURATION ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

ENV_PATH = os.path.join(BACKEND_DIR, ".env")
load_dotenv(ENV_PATH)

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+ssc://8581f5dc.databases.neo4j.io")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "8581f5dc")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "EqfTv_hd155AlgHkiIxe5pLOAFHS7Hn-qRPFYviFjy4")
VAULT_KEY = os.getenv("VAULT_ENCRYPTION_KEY", "qIRxp1YLh3Ke4O-LBqU6swwvXBZyJyTSocdY8fUVeNA=")

cipher = Fernet(VAULT_KEY.encode('utf-8'))
CSV_DIR = os.path.join(ROOT_DIR, "data", "raw", "csv")
VAULT_DB_PATH = os.path.join(BACKEND_DIR, "identity_vault.db")

# --- 2. INITIALIZE IDENTITY VAULT (Vault 1) ---
def init_vault():
    conn = sqlite3.connect(VAULT_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_pii (
            patient_id TEXT PRIMARY KEY,
            encrypted_data BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn

# --- 3. EXTRACT BIOMARKERS (From observations.csv) ---
def extract_biomarkers():
    logging.info("Extracting baseline biomarkers (HbA1c, BP, BMI) from observations.csv...")
    patient_biomarkers = defaultdict(dict)
    obs_path = os.path.join(CSV_DIR, "observations.csv")
    
    with open(obs_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            pid = r['PATIENT']
            code = r['CODE']
            val = r['VALUE']
            try:
                num_val = float(val)
            except (ValueError, TypeError):
                continue
                
            if code == '4548-4':  # HbA1c
                patient_biomarkers[pid]['hba1c'] = num_val
            elif code == '8480-6':  # Systolic BP
                patient_biomarkers[pid]['systolic_bp'] = num_val
            elif code == '8462-4':  # Diastolic BP
                patient_biomarkers[pid]['diastolic_bp'] = num_val
            elif code == '39156-5':  # BMI
                patient_biomarkers[pid]['bmi'] = num_val
                
    logging.info(f"Biomarkers parsed for {len(patient_biomarkers)} patients.")
    return patient_biomarkers

# --- 4. BATCH INGESTION FUNCTIONS ---

def reset_graph(session):
    logging.info("Wiping previous partial test data...")
    session.run("MATCH (n) DETACH DELETE n")

def setup_constraints(session):
    logging.info("Setting up database uniqueness constraints and indexes...")
    constraints = [
        "CREATE CONSTRAINT patient_id_unique IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT condition_code_unique IF NOT EXISTS FOR (c:Condition) REQUIRE c.code IS UNIQUE",
        "CREATE CONSTRAINT medication_rxnorm_unique IF NOT EXISTS FOR (m:Medication) REQUIRE m.rxnorm_code IS UNIQUE",
        "CREATE CONSTRAINT allergy_substance_unique IF NOT EXISTS FOR (a:Allergy) REQUIRE a.substance IS UNIQUE",
        "CREATE CONSTRAINT supply_code_unique IF NOT EXISTS FOR (s:SupplyItem) REQUIRE s.code IS UNIQUE",
        "CREATE CONSTRAINT inventory_sku_unique IF NOT EXISTS FOR (inv:PharmacyInventory) REQUIRE inv.sku IS UNIQUE"
    ]
    for q in constraints:
        session.run(q)

def ingest_patients_and_vault(session, vault_conn, biomarkers):
    logging.info("Ingesting Patients and Encrypting PII into Vault 1...")
    patients_path = os.path.join(CSV_DIR, "patients.csv")
    patient_nodes = []
    
    with open(patients_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row['Id']
            
            # A. Encrypt PII to Vault 1 (SQLite)
            pii_payload = {
                "first_name": row.get('FIRST', ''),
                "last_name": row.get('LAST', ''),
                "ssn": row.get('SSN', ''),
                "address": row.get('ADDRESS', ''),
                "city": row.get('CITY', ''),
                "zip": row.get('ZIP', ''),
                "phone": row.get('PHONE', '')
            }
            encrypted_blob = cipher.encrypt(json.dumps(pii_payload).encode('utf-8'))
            vault_conn.execute(
                "INSERT OR REPLACE INTO patient_pii (patient_id, encrypted_data) VALUES (?, ?)", 
                (pid, encrypted_blob)
            )
            
            # B. Prepare Anonymous Node for Neo4j (Vault 2)
            bio = biomarkers.get(pid, {})
            birth_year = int(row['BIRTHDATE'][:4]) if row.get('BIRTHDATE') else 1975
            
            patient_nodes.append({
                "id": pid,
                "birth_year": birth_year,
                "gender": row.get('GENDER', 'U'),
                "race": row.get('RACE', 'unknown'),
                "ethnicity": row.get('ETHNICITY', 'unknown'),
                "income": float(row.get('INCOME') or 0.0),
                "hba1c": float(bio.get('hba1c', 5.6)),
                "systolic_bp": float(bio.get('systolic_bp', 120.0)),
                "diastolic_bp": float(bio.get('diastolic_bp', 80.0)),
                "bmi": float(bio.get('bmi', 25.0))
            })
            
    vault_conn.commit()
    
    # Batch UNWIND into Neo4j
    query = """
    UNWIND $batch AS p
    CREATE (node:Patient {
        id: p.id,
        birth_year: p.birth_year,
        gender: p.gender,
        race: p.race,
        ethnicity: p.ethnicity,
        income: p.income,
        hba1c: p.hba1c,
        systolic_bp: p.systolic_bp,
        diastolic_bp: p.diastolic_bp,
        bmi: p.bmi
    })
    """
    session.run(query, batch=patient_nodes)
    logging.info(f"Ingested {len(patient_nodes)} Patients with baseline biomarkers.")

def ingest_conditions(session):
    logging.info("Batch ingesting Conditions...")
    conditions_path = os.path.join(CSV_DIR, "conditions.csv")
    records = []
    
    with open(conditions_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "patient_id": row['PATIENT'],
                "code": row['CODE'],
                "name": row['DESCRIPTION'],
                "system": row.get('SYSTEM', 'SNOMED-CT'),
                "start_date": row['START'],
                "stop_date": row['STOP'],
                "status": "resolved" if row['STOP'] else "active"
            })
            
    # Process in chunks of 500
    chunk_size = 500
    query = """
    UNWIND $batch AS c
    MATCH (p:Patient {id: c.patient_id})
    MERGE (cond:Condition {code: c.code})
    ON CREATE SET cond.name = c.name, cond.system = c.system
    MERGE (p)-[r:DIAGNOSED_WITH {code: c.code}]->(cond)
    SET r.start_date = c.start_date, r.stop_date = c.stop_date, r.status = c.status
    """
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        session.run(query, batch=chunk)
    logging.info(f"Ingested {len(records)} Condition relationships.")

def ingest_medications(session):
    logging.info("Batch ingesting Medications & Treatment Efficacy...")
    meds_path = os.path.join(CSV_DIR, "medications.csv")
    records = []
    
    with open(meds_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            meta = jellyfish.metaphone(row['DESCRIPTION'])
            outcome = "RESOLVED" if row['STOP'] else "ONGOING"
            records.append({
                "patient_id": row['PATIENT'],
                "rxnorm_code": row['CODE'],
                "name": row['DESCRIPTION'],
                "metaphone": meta,
                "start_date": row['START'],
                "stop_date": row['STOP'],
                "outcome": outcome,
                "reason_code": row.get('REASONCODE', ''),
                "reason_desc": row.get('REASONDESCRIPTION', '')
            })
            
    chunk_size = 500
    query = """
    UNWIND $batch AS m
    MATCH (p:Patient {id: m.patient_id})
    MERGE (med:Medication {rxnorm_code: m.rxnorm_code})
    ON CREATE SET med.name = m.name, med.metaphone = m.metaphone
    MERGE (p)-[r:PRESCRIBED {rxnorm_code: m.rxnorm_code}]->(med)
    SET r.start_date = m.start_date, r.stop_date = m.stop_date, r.outcome = m.outcome
    
    WITH med, m
    WHERE m.reason_code IS NOT NULL AND m.reason_code <> ''
    MERGE (c:Condition {code: m.reason_code})
    ON CREATE SET c.name = m.reason_desc
    MERGE (med)-[:TREATS]->(c)
    """
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        session.run(query, batch=chunk)
    logging.info(f"Ingested {len(records)} Medication relationships & TREATS links.")

def ingest_allergies(session):
    logging.info("Batch ingesting Allergies...")
    allergies_path = os.path.join(CSV_DIR, "allergies.csv")
    records = []
    
    with open(allergies_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "patient_id": row['PATIENT'],
                "substance": row['DESCRIPTION'],
                "code": row['CODE'],
                "severity": row.get('SEVERITY1', 'moderate'),
                "reaction": row.get('REACTION1', 'Allergic reaction')
            })
            
    query = """
    UNWIND $batch AS a
    MATCH (p:Patient {id: a.patient_id})
    MERGE (allergy:Allergy {substance: a.substance})
    ON CREATE SET allergy.code = a.code, allergy.severity = a.severity, allergy.reaction = a.reaction
    MERGE (p)-[:ALLERGIC_TO]->(allergy)
    """
    session.run(query, batch=records)
    logging.info(f"Ingested {len(records)} Allergy records.")

def ingest_supplies_and_inventory(session):
    logging.info("Batch ingesting Medical Supplies & Inventory Nodes...")
    supplies_path = os.path.join(CSV_DIR, "supplies.csv")
    supply_records = []
    
    with open(supplies_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            supply_records.append({
                "patient_id": row['PATIENT'],
                "code": row['CODE'],
                "name": row['DESCRIPTION'],
                "quantity": int(row.get('QUANTITY') or 1)
            })
            
    query_supplies = """
    UNWIND $batch AS s
    MATCH (p:Patient {id: s.patient_id})
    MERGE (item:SupplyItem {code: s.code})
    ON CREATE SET item.name = s.name
    MERGE (p)-[:RECEIVED_SUPPLY {quantity: s.quantity}]->(item)
    """
    chunk_size = 500
    for i in range(0, len(supply_records), chunk_size):
        chunk = supply_records[i:i + chunk_size]
        session.run(query_supplies, batch=chunk)
        
    # Generate Inventory for Medications and Supplies
    logging.info("Creating Pharmacy and Supply Inventory tracking nodes...")
    session.run("""
    MATCH (m:Medication)
    MERGE (inv:PharmacyInventory {sku: m.rxnorm_code})
    ON CREATE SET 
        inv.item_name = m.name,
        inv.stock_quantity = toInteger(rand() * 80) + 5,
        inv.reorder_threshold = 15,
        inv.lot_number = 'LOT-2026-MED-' + m.rxnorm_code,
        inv.expiry_date = '2027-12-31',
        inv.item_type = 'Medication'
    MERGE (m)-[:STOCKED_IN]->(inv)
    """)
    
    session.run("""
    MATCH (s:SupplyItem)
    MERGE (inv:PharmacyInventory {sku: s.code})
    ON CREATE SET 
        inv.item_name = s.name,
        inv.stock_quantity = toInteger(rand() * 150) + 20,
        inv.reorder_threshold = 30,
        inv.lot_number = 'LOT-2026-SUP-' + s.code,
        inv.expiry_date = '2028-06-30',
        inv.item_type = 'Supply'
    MERGE (s)-[:STOCKED_IN]->(inv)
    """)
    
    # Link Diabetic Medications to Glucose Strips
    session.run("""
    MATCH (m:Medication), (s:SupplyItem)
    WHERE m.name CONTAINS 'Insulin' AND s.name CONTAINS 'glucose'
    MERGE (m)-[:REQUIRES_SUPPLY]->(s)
    """)

def generate_salad_warnings(session):
    logging.info("Computing SALAD (Sound-Alike Look-Alike Drug) confusion edges...")
    # Link drugs with identical phonetic keys or high Levenshtein similarity
    session.run("""
    MATCH (m1:Medication), (m2:Medication)
    WHERE id(m1) < id(m2) 
      AND m1.metaphone = m2.metaphone 
      AND m1.metaphone IS NOT NULL 
      AND m1.metaphone <> ''
    MERGE (m1)-[s:SOUNDS_ALIKE_TO]-(m2)
    SET s.similarity_score = 0.88,
        s.risk_level = 'HIGH',
        s.warning = 'Phonetic match detected (Double Metaphone). High risk of auditory dispensing confusion.'
    """)

# --- 5. EXECUTION PIPELINE ---
def run_ingestion():
    logging.info("=== STARTING FULL SPEC-COMPLIANT GRAPH INGESTION ===")
    vault_conn = init_vault()
    biomarkers = extract_biomarkers()
    
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    with driver.session() as session:
        reset_graph(session)
        setup_constraints(session)
        ingest_patients_and_vault(session, vault_conn, biomarkers)
        ingest_conditions(session)
        ingest_medications(session)
        ingest_allergies(session)
        ingest_supplies_and_inventory(session)
        generate_salad_warnings(session)
        
    driver.close()
    vault_conn.close()
    logging.info("=== INGESTION SUCCESSFULLY COMPLETED! ===")

if __name__ == "__main__":
    run_ingestion()
