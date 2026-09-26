# MedIntel — Clinical Intelligence & Graph Digital Twin Platform

MedIntel is an enterprise-grade Clinical Decision Support and Digital Twin EHR platform powered by **Neo4j Aura Cloud**, a **HIPAA Two-Vault Architecture**, and an **On-Device Ambient Clinical AI Scribe**.

---

## 🚀 Quickstart (Zero-Setup)

### Option A: 1-Click Launcher (Windows)
Double-click `run_project.bat` in the project root.  
It automatically:
1. Provisions `backend/.env` from `.env.example`
2. Installs backend and frontend dependencies
3. Launches both the Flask backend (`http://localhost:5000`) and the React/Vite UI (`http://localhost:5173`)
4. Opens your browser automatically.

---

### Option B: Manual Setup (Windows / macOS / Linux)

#### 1. Backend (Terminal 1)
```bash
# Optional: create a virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

pip install -r backend/requirements.txt
python backend/app.py
```
> *Note: Pre-configured cloud credentials for Neo4j Aura and Vault 1 are built directly into `backend/config.py`, so you do not even need to set up a database.*

#### 2. Frontend (Terminal 2)
```bash
npm install
npm run dev
```

Visit **http://localhost:5173** to use the application.

---

## 🎙️ Ambient AI Scribe (100% On-Device Privacy)

- **Speech-to-Text**: Powered by **Useful Sensors Moonshine** (`moonshine/tiny`), executing 100% on-device on CPU with zero cloud audio transit.
- **Zero-Latency Live Streaming**: The browser's native WebSpeech API streams live interim syllables on-screen while recording.
- **Physician Review & Sign-Off**: Generated SOAP notes, proposed diagnoses, and medications are staged in an approval gateway before any database mutations occur.
- **Safety Pre-Checks**: Automated cross-checks against documented patient allergies, Sound-Alike Look-Alike Drugs (SALAD), and pharmacy supply levels.

---

## 🔐 Architecture Highlights

1. **Two-Vault Architecture (HIPAA/GDPR)**:
   - **Vault 1 (Encrypted Identity Vault)**: Stores patient PII (Name, SSN, Address) encrypted with AES-256 Fernet in SQLite (`identity_vault.db`). Accessible only via Break-Glass authorization.
   - **Vault 2 (De-Identified Clinical Graph)**: Neo4j Aura Cloud graph storing conditions, treatments, medications, allergies, and supply chain inventory.
2. **Patient Digital Twin**:
   - Vector similarity across metabolic parameters (HbA1c, BP, BMI, age) matching high-dimensional clinical cohorts.
3. **Pharmacy Supply Chain Intelligence**:
   - Stock level checks, automated in-stock therapeutic substitutions, and FDA batch recalls.
