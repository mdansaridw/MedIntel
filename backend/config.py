import os
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "domain-expansion")
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    PORT = int(os.getenv("PORT", 5000))
    
    # Neo4j Aura Cloud DB (Defaults to team Aura cloud instance)
    NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+ssc://8581f5dc.databases.neo4j.io")
    NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "8581f5dc")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "EqfTv_hd155AlgHkiIxe5pLOAFHS7Hn-qRPFYviFjy4")
    NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
    AURA_INSTANCEID = os.getenv("AURA_INSTANCEID", "8581f5dc")
    
    # Security (Default Fernet Vault 1 Key)
    VAULT_ENCRYPTION_KEY = os.getenv("VAULT_ENCRYPTION_KEY", "qIRxp1YLh3Ke4O-LBqU6swwvXBZyJyTSocdY8fUVeNA=")
    
    # AI / LLM
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
