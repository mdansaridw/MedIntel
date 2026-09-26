import logging
import sqlite3
import json
from typing import List, Dict, Any, Optional
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

from ..graph.neo4j_client import Neo4jClient

logger = logging.getLogger(__name__)

# Load Vault Key for decrypting patient contacts during FDA recall
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(BASE_DIR, ".env"))
VAULT_KEY = os.getenv("VAULT_ENCRYPTION_KEY", "qIRxp1YLh3Ke4O-LBqU6swwvXBZyJyTSocdY8fUVeNA=")
cipher = Fernet(VAULT_KEY.encode('utf-8')) if VAULT_KEY else None
VAULT_DB_PATH = os.path.join(BASE_DIR, "identity_vault.db")

class SupplyChainEngine:
    """
    Implements Supply Chain features including Inventory Audits, Alternative Recommendations,
    Companion Supplies, and FDA Batch Recalls (linking Graph to Vault 1).
    """

    @staticmethod
    def check_prescription_stock(rxnorm_code: str) -> Dict[str, Any]:
        """
        Checks real-time stock for a medication. If out of stock, recommends 
        the best in-stock alternative for the same condition.
        Also checks for required companion supplies (e.g. Glucose strips).
        """
        cypher_query = """
        MATCH (m:Medication {rxnorm_code: $code})
        OPTIONAL MATCH (m)-[:STOCKED_IN]->(inv:PharmacyInventory)
        
        // Check for companion supplies
        OPTIONAL MATCH (m)-[:REQUIRES_SUPPLY]->(s:SupplyItem)-[:STOCKED_IN]->(s_inv:PharmacyInventory)
        WITH m, inv, collect({name: s.name, sku: s.code, stock: s_inv.stock_quantity}) AS companion_supplies
        
        // Find conditions this drug treats
        OPTIONAL MATCH (m)-[:TREATS]->(c:Condition)
        WITH m, inv, companion_supplies, collect(c) AS conditions
        
        // Find alternatives if stock is low
        OPTIONAL MATCH (alt_c:Condition)<-[:TREATS]-(alt:Medication)-[:STOCKED_IN]->(alt_inv:PharmacyInventory)
        WHERE alt_c IN conditions AND alt.rxnorm_code <> m.rxnorm_code AND alt_inv.stock_quantity > 0
        
        // Get historical efficacy of alternatives
        OPTIONAL MATCH (alt)<-[r:PRESCRIBED]-()
        WITH m, inv, companion_supplies, alt, alt_inv,
             count(r) AS alt_prescriptions, 
             sum(CASE WHEN r.outcome = 'RESOLVED' THEN 1 ELSE 0 END) AS alt_resolved
             
        WITH m, inv, companion_supplies, alt, alt_inv,
             (CASE WHEN alt_prescriptions > 0 THEN round(toFloat(alt_resolved)/alt_prescriptions * 100, 2) ELSE 0 END) AS alt_efficacy
        ORDER BY alt_efficacy DESC
        
        WITH m, inv, companion_supplies,
             collect({name: alt.name, code: alt.rxnorm_code, stock: alt_inv.stock_quantity, efficacy: alt_efficacy})[0..3] AS alternatives
             
        RETURN m.name AS medication_name,
               m.rxnorm_code AS rxnorm_code,
               inv.stock_quantity AS stock_quantity,
               inv.reorder_threshold AS reorder_threshold,
               (inv.stock_quantity <= inv.reorder_threshold) AS is_low_stock,
               (inv.stock_quantity = 0) AS is_out_of_stock,
               companion_supplies,
               alternatives
        """
        try:
            results = Neo4jClient.query(cypher_query, {"code": rxnorm_code})
            return results[0] if results else {}
        except Exception as e:
            logger.error(f"Error checking prescription stock: {e}")
            raise

    @staticmethod
    def fda_lot_recall_audit(lot_number: str) -> Dict[str, Any]:
        """
        1-Hop FDA Batch Recall Query.
        Given a defective lot number (e.g. from an FDA recall), find all anonymous patient IDs
        in the Neo4j Graph who received this item, then cross-reference Vault 1 (SQLite) 
        to decrypt their contact information for emergency notification.
        """
        # STEP 1: Graph Query (Vault 2) - Find Anonymous Patients affected by the Lot
        cypher_query = """
        MATCH (inv:PharmacyInventory {lot_number: $lot_number})<-[:STOCKED_IN]-(item)
        // Item could be Medication or SupplyItem
        OPTIONAL MATCH (item)<-[r_med:PRESCRIBED]-(p_med:Patient)
        OPTIONAL MATCH (item)<-[r_sup:RECEIVED_SUPPLY]-(p_sup:Patient)
        
        WITH inv, item, collect(DISTINCT p_med.id) + collect(DISTINCT p_sup.id) AS raw_patient_ids
        UNWIND raw_patient_ids AS pid
        WITH inv, item, pid WHERE pid IS NOT NULL
        
        RETURN item.name AS item_name,
               inv.sku AS sku,
               inv.stock_quantity AS remaining_stock,
               collect(DISTINCT pid) AS affected_patient_ids
        """
        
        try:
            graph_results = Neo4jClient.query(cypher_query, {"lot_number": lot_number})
            if not graph_results:
                return {"status": "Not Found", "message": "Lot number not found in graph."}
                
            record = graph_results[0]
            affected_ids = record["affected_patient_ids"]
            
            # STEP 2: Identity Resolution (Vault 1) - Decrypt emergency contact info
            emergency_contacts = []
            if affected_ids and cipher:
                conn = sqlite3.connect(VAULT_DB_PATH)
                cursor = conn.cursor()
                
                placeholders = ','.join(['?'] * len(affected_ids))
                cursor.execute(f"SELECT patient_id, encrypted_data FROM patient_pii WHERE patient_id IN ({placeholders})", affected_ids)
                
                for pid, enc_data in cursor.fetchall():
                    try:
                        decrypted_json = cipher.decrypt(enc_data).decode('utf-8')
                        pii = json.loads(decrypted_json)
                        emergency_contacts.append({
                            "patient_id": pid,
                            "name": f"{pii.get('first_name', '')} {pii.get('last_name', '')}",
                            "address": pii.get('address', ''),
                            "phone": pii.get('phone', 'N/A')
                        })
                    except Exception as dec_err:
                        logger.error(f"Failed to decrypt PII for {pid}: {dec_err}")
                conn.close()
                
            return {
                "lot_number": lot_number,
                "item_name": record["item_name"],
                "remaining_stock_to_destroy": record["remaining_stock"],
                "total_affected_patients": len(affected_ids),
                "emergency_contact_list": emergency_contacts
            }
            
        except Exception as e:
            logger.error(f"Error performing FDA Recall Audit: {e}")
            raise
