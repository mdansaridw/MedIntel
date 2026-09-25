import logging
from typing import List, Dict, Any, Optional
from .neo4j_client import Neo4jClient
from .vector_sim import PatientSimilarityEngine

logger = logging.getLogger(__name__)

class TreatmentIntelligenceEngine:
    """
    Implements the 3-Level Treatment Intelligence Hierarchy as specified in docs/DECISIONS_AND_SPECS.md.
    """

    @staticmethod
    def get_global_disease_intelligence(condition_code: str) -> List[Dict[str, Any]]:
        """
        Level 1: Global Disease Intelligence (Macro / Population)
        Calculates the historical efficacy rate of all medications prescribed for a specific condition.
        """
        cypher_query = """
        MATCH (c:Condition {code: $condition_code})<-[:TREATS]-(m:Medication)<-[r:PRESCRIBED]-(p:Patient)
        WITH m, count(r) AS total_prescriptions, sum(CASE WHEN r.outcome = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count
        WHERE total_prescriptions > 0
        
        // Add Supply Chain integration: check if the hospital pharmacy has this in stock
        OPTIONAL MATCH (m)-[:STOCKED_IN]->(inv:PharmacyInventory)
        
        RETURN m.rxnorm_code AS rxnorm_code,
               m.name AS medication_name,
               total_prescriptions,
               resolved_count,
               round(toFloat(resolved_count) / total_prescriptions * 100, 2) AS efficacy_rate_pct,
               coalesce(inv.stock_quantity, 0) AS current_stock
        ORDER BY efficacy_rate_pct DESC, total_prescriptions DESC
        """
        try:
            return Neo4jClient.query(cypher_query, {"condition_code": condition_code})
        except Exception as e:
            logger.error(f"Error in Level 1 Treatment Intelligence: {e}")
            raise

    @staticmethod
    def get_cohort_intelligence(primary_condition_code: str, 
                                comorbidity_codes: List[str], 
                                min_age: int = 0, 
                                max_age: int = 120) -> List[Dict[str, Any]]:
        """
        Level 2: Cohort-Level Intelligence
        Finds the best treatments for a specific patient sub-population (e.g. Age 50-65 with Diabetes AND Hypertension).
        """
        # We calculate age based on an assumed current year of 2026.
        # min_age 50 means birth_year <= (2026 - 50) -> 1976
        # max_age 65 means birth_year >= (2026 - 65) -> 1961
        cypher_query = """
        // Find cohort patients matching demographics
        MATCH (p:Patient)-[:DIAGNOSED_WITH]->(c:Condition {code: $primary_cond})
        WHERE p.birth_year <= (2026 - $min_age) AND p.birth_year >= (2026 - $max_age)
        
        // Ensure they have ALL specified comorbidities
        WITH p, c
        WHERE all(code IN $comorbidities WHERE exists((p)-[:DIAGNOSED_WITH]->(:Condition {code: code})))
        
        // Analyze their treatments for the primary condition
        MATCH (m:Medication)<-[r:PRESCRIBED]-(p)
        MATCH (m)-[:TREATS]->(c)
        WITH m, count(r) AS cohort_prescriptions, sum(CASE WHEN r.outcome = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count
        WHERE cohort_prescriptions > 0
        
        // Include SALAD Warnings (Sound-Alike Look-Alike Drugs)
        OPTIONAL MATCH (m)-[salad:SOUNDS_ALIKE_TO]-(confusable:Medication)
        
        RETURN m.rxnorm_code AS rxnorm_code,
               m.name AS medication_name,
               cohort_prescriptions,
               round(toFloat(resolved_count) / cohort_prescriptions * 100, 2) AS cohort_efficacy_pct,
               collect(DISTINCT confusable.name) AS salad_warnings
        ORDER BY cohort_efficacy_pct DESC, cohort_prescriptions DESC
        """
        try:
            return Neo4jClient.query(cypher_query, {
                "primary_cond": primary_condition_code,
                "comorbidities": comorbidity_codes,
                "min_age": min_age,
                "max_age": max_age
            })
        except Exception as e:
            logger.error(f"Error in Level 2 Treatment Intelligence: {e}")
            raise

    @staticmethod
    def get_personalized_patient_intelligence(target_patient_id: str) -> Dict[str, Any]:
        """
        Level 3: Personalized Patient Intelligence (Micro / Individual)
        Combines Patient Similarity (Method 4) with Allergy filtering, SALAD warnings, and Pharmacy Inventory checks.
        """
        # 1. Get similar patients and baseline treatments using Method 4
        similar_patients = PatientSimilarityEngine.find_similar_patients(target_patient_id, top_k=5)
        
        # 2. Extract the raw list of recommended treatments from twins
        raw_treatments = []
        for p in similar_patients:
            raw_treatments.extend(p.get("effective_treatments", []))
        
        # Deduplicate
        raw_treatments = list(set(raw_treatments))
        
        # 3. Enrich treatments with Supply Chain and SALAD data
        cypher_query = """
        UNWIND $treatments AS med_name
        MATCH (m:Medication {name: med_name})
        
        // Check Inventory
        OPTIONAL MATCH (m)-[:STOCKED_IN]->(inv:PharmacyInventory)
        
        // Check SALAD Warnings
        OPTIONAL MATCH (m)-[salad:SOUNDS_ALIKE_TO]-(confusable:Medication)
        
        // Check Companion Supplies (e.g. Glucose strips)
        OPTIONAL MATCH (m)-[:REQUIRES_SUPPLY]->(supply:SupplyItem)
        
        RETURN m.name AS recommended_medication,
               coalesce(inv.stock_quantity, 0) AS stock_quantity,
               inv.reorder_threshold AS reorder_threshold,
               collect(DISTINCT confusable.name) AS salad_confusables,
               collect(DISTINCT supply.name) AS required_supplies
        """
        
        enriched_treatments = []
        if raw_treatments:
            try:
                enriched_treatments = Neo4jClient.query(cypher_query, {"treatments": raw_treatments})
            except Exception as e:
                logger.error(f"Error enriching Level 3 treatments: {e}")
        
        return {
            "target_patient_id": target_patient_id,
            "similar_cohort_size": len(similar_patients),
            "top_twins": similar_patients,
            "personalized_treatment_plan": enriched_treatments
        }
