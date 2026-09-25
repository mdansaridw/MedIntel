# MedIntel Frontend

Frontend-only React and TypeScript interface for the MedIntel clinical intelligence demo.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router
- Vis Network (reserved for the Knowledge Graph integration)
- Lucide React icons

## Local development

```bash
npm install
npm run dev
```

The development server listens on the URL printed by Vite.

## Quality checks

```bash
npm run lint
npm run build
```

## Routes

- `/` — empty Home page body
- `/dashboard` — summary cards and reserved overview area
- `/patients` — 30 synthetic patient records
- `/cohorts` — 40 synthetic disease cohorts
- `/cohorts/:cohortId` — cohort statistics and associated patients
- `/treatment-intelligence` — patient treatment profiles
- `/treatment-intelligence/:patientId` — patient intelligence scaffold
- `/knowledge-graph` — reserved empty page body
- `/admin` — reserved empty page body
- `/chatbot` — reserved empty page body

All patient and clinical values are synthetic demonstration data.
