import logging
from typing import List, Dict, Any
from .neo4j_client import Neo4jClient

logger = logging.getLogger(__name__)

class PatientSimilarityEngine:
    """
    Implements Method 4: Graph-Pruned Weighted Hybrid Similarity
    As specified in docs/DECISIONS_AND_SPECS.md:
    
    Similarity(P1, P2) = 0.50 * Jaccard(Conditions) 
                       + 0.35 * Sim(Biomarkers: HbA1c, BP, BMI) 
                       + 0.15 * Sim(Demographics: Age & Gender)
    """

    @staticmethod
    def find_similar_patients(target_patient_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Finds the top_k most similar patients for a target patient using the
        agreed 50/35/15 Hybrid formula, and returns effective treatments while
        filtering out allergies.
        """
        cypher_query = """
        // 1. Fetch Target Patient with Conditions and Allergies
        MATCH (target:Patient {id: $target_id})
        OPTIONAL MATCH (target)-[:DIAGNOSED_WITH]->(tc:Condition)
        WITH target, collect(DISTINCT tc.code) AS target_cond_codes, collect(DISTINCT tc.name) AS target_cond_names
        
        // Target's documented allergies
        OPTIONAL MATCH (target)-[:ALLERGIC_TO]->(ta:Allergy)
        WITH target, target_cond_codes, target_cond_names, collect(DISTINCT toLower(ta.substance)) AS target_allergies
        
        // 2. Step 1 (Graph Pruning): Narrow search to candidates sharing at least 1 condition
        MATCH (candidate:Patient)-[:DIAGNOSED_WITH]->(cc:Condition)
        WHERE candidate.id <> target.id AND cc.code IN target_cond_codes
        WITH target, target_cond_codes, target_cond_names, target_allergies,
             candidate, collect(DISTINCT cc.name) AS shared_conditions, count(DISTINCT cc) AS shared_count
        
        // Count total unique conditions for candidate to calculate Jaccard
        MATCH (candidate)-[:DIAGNOSED_WITH]->(all_cc:Condition)
        WITH target, target_cond_codes, target_cond_names, target_allergies,
             candidate, shared_conditions, shared_count, count(DISTINCT all_cc) AS candidate_total_cond
             
        // 3. Mathematical Metric 1: Condition Jaccard Similarity (Weight: 50%)
        WITH target, target_allergies, candidate, shared_conditions,
             toFloat(shared_count) / (size(target_cond_codes) + candidate_total_cond - shared_count) AS jaccard_conditions
        
        // 4. Mathematical Metric 2: Normalized Biomarker Proximity (Weight: 35%)
        // Ranges: HbA1c (4.0 - 14.0, span=10), SysBP (80 - 200, span=120), DiaBP (50 - 130, span=80), BMI (15 - 50, span=35)
        WITH target, target_allergies, candidate, shared_conditions, jaccard_conditions,
             abs(coalesce(target.hba1c, 5.6) - coalesce(candidate.hba1c, 5.6)) / 10.0 AS d_hba1c,
             abs(coalesce(target.systolic_bp, 120.0) - coalesce(candidate.systolic_bp, 120.0)) / 120.0 AS d_sys,
             abs(coalesce(target.diastolic_bp, 80.0) - coalesce(candidate.diastolic_bp, 80.0)) / 80.0 AS d_dia,
             abs(coalesce(target.bmi, 25.0) - coalesce(candidate.bmi, 25.0)) / 35.0 AS d_bmi
             
        WITH target, target_allergies, candidate, shared_conditions, jaccard_conditions,
             1.0 - ((d_hba1c + d_sys + d_dia + d_bmi) / 4.0) AS sim_biomarkers
             
        // 5. Mathematical Metric 3: Demographics Similarity (Weight: 15%)
        // Age proximity (10%) + Gender match (5%)
        WITH target, target_allergies, candidate, shared_conditions, jaccard_conditions, sim_biomarkers,
             1.0 - (abs(coalesce(target.birth_year, 1975) - coalesce(candidate.birth_year, 1975)) / 100.0) AS sim_age,
             (CASE WHEN target.gender = candidate.gender THEN 1.0 ELSE 0.0 END) AS sim_gender
             
        WITH candidate, shared_conditions,
             jaccard_conditions,
             sim_biomarkers,
             (sim_age * 0.10 + sim_gender * 0.05) AS sim_demo,
             // Final Formula: 0.50 * Conditions + 0.35 * Biomarkers + 0.15 * Demographics
             (0.50 * jaccard_conditions + 0.35 * sim_biomarkers + (sim_age * 0.10 + sim_gender * 0.05)) AS total_similarity,
             target_allergies
        ORDER BY total_similarity DESC
        LIMIT $top_k
        
        // 6. Treatment Intelligence: Retrieve effective treatments from similar candidates
        // Filtering out any drug that matches target patient allergies!
        OPTIONAL MATCH (candidate)-[r:PRESCRIBED]->(m:Medication)
        WHERE (r.outcome = 'RESOLVED' OR r.stop_date IS NULL)
          AND NOT any(allergy IN target_allergies WHERE toLower(m.name) CONTAINS allergy)
        
        RETURN candidate.id AS similar_patient_id,
               round(total_similarity * 100, 2) AS overall_similarity_pct,
               round(jaccard_conditions * 100, 2) AS condition_overlap_pct,
               round(sim_biomarkers * 100, 2) AS biomarker_similarity_pct,
               round((sim_demo / 0.15) * 100, 2) AS demographic_match_pct,
               candidate.birth_year AS birth_year,
               candidate.gender AS gender,
               candidate.hba1c AS hba1c,
               candidate.systolic_bp AS systolic_bp,
               candidate.diastolic_bp AS diastolic_bp,
               candidate.bmi AS bmi,
               shared_conditions,
               collect(DISTINCT m.name) AS effective_treatments
        """
        try:
            results = Neo4jClient.query(cypher_query, {
                "target_id": target_patient_id,
                "top_k": top_k
            })
            return results
        except Exception as e:
            logger.error(f"Error computing hybrid patient similarity: {e}")
            raise
