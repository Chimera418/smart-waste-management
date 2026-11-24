# CivicClean SWM — Complete Integrated Smart Waste Management System

Unified production application integrating **Person 1 (Citizen & Complaint Management)**, **Person 2 (Collection & Fleet Management)**, and **Person 3 (Administration & Analytics)**.

## Integrated Capabilities
- **4 Role-Specific Dashboards**: Citizen, Sanitation Worker, Vehicle Operator, Municipal Administrator.
- **Text-First Complaint Workflow + Gemini AI**: Natural-language complaint submission, structured JSON categorization (`@google/genai` `gemini-3-flash-preview`), duplicate proximity/text check, AI priority estimation with safety rules, and citizen waste chatbot.
- **Operations & Fleet**: Worker registration & availability, vehicle fleet management, deterministic Vehicle Recommendation Algorithm, task dispatch & lifecycle, GeoJSON collection zones (`$geoIntersects` / `$geoWithin`), and live Leaflet + OpenStreetMap GPS tracking.
- **Administration, SLA & Analytics**: Recharts analytics backed by MongoDB aggregation pipelines, geospatial hotspot clustering, automatic SLA escalation + Vercel daily cron (`/api/cron/escalate`), Nodemailer/Firebase-compatible notifications, immutable audit logs, and CSV/JSON reporting.

## Local Setup & Commands

```bash
cp .env.example .env
npm install
npm run seed       # Populates demo accounts, 3 GeoJSON zones, 4 vehicles, complaints & tasks
npm run dev        # Frontend http://localhost:5170 + API http://127.0.0.1:4000
npm test           # Full cross-module Vitest + Supertest integration suite
npm run typecheck  # TypeScript strict check
npm run build      # Vite production bundle -> dist/
```

### Seeded Demo Credentials (Password: `Demo@1234`)
- **Admin**: `admin@civicclean.org`
- **Citizen**: `citizen@civicclean.org`
- **Worker**: `worker@civicclean.org`
- **Vehicle Operator**: `operator@civicclean.org`

## Documentation
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Shared Database Schema](./docs/DATABASE_SCHEMA.md)
- [Shared API Contracts](./docs/API_CONTRACTS.md)
- [OpenAPI 3.0 Spec](./docs/openapi.json)
- [Testing Strategy](./docs/TESTING.md)
- [Vercel Free-Tier Deployment Guide](./docs/DEPLOYMENT.md)
- [SimilarWeb Benchmark Report](./docs/SIMILARWEB_ANALYSIS.md)
