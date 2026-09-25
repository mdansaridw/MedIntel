import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "medisynapse-default-hackathon-key")
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    PORT = int(os.getenv("PORT", 5000))
    
    # Neo4j Aura Cloud DB
    NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://localhost:7687")
    NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # Security
    VAULT_ENCRYPTION_KEY = os.getenv("VAULT_ENCRYPTION_KEY", "bWVkaXN5bmFwc2Utc2VjcmV0LWtleS0zMi1ieXRlcwo=")
    
    # AI / LLM
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
