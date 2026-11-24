# CivicClean SWM — Smart Waste Management System

> **New here?** Read the complete walkthrough, workflow diagrams, live GPS tracking guide, and demo script in **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)**.

A production-quality, Vercel Hobby Free-Plan compatible Full Stack Smart Waste Management System built with **React, TypeScript, Vite, Tailwind CSS v4, Express.js, MongoDB Atlas (GeoJSON + 2dsphere + Aggregations), Leaflet/OpenStreetMap, Recharts, and Google Gemini API (`@google/genai`)**.

## Repository & Workspace Structure

```text
Smart-Waste-Management/
├── Person-1-Citizen-Management/          # Developer 1: Auth, Citizen Portal, Complaints, Gemini Categorizer, Duplicates, Chatbot
├── Person-2-Collection-Fleet-Management/ # Developer 2: Workers, Fleet, Tasks, Zones, Vehicle Recommendation, Live GPS Map
├── Person-3-Administration-Analytics/    # Developer 3: Admin Dashboard, Gemini Priority, Notifications, Escalations, Recharts, Hotspots, Audit
├── Smart-Waste-Management-Full-Application/ # Unified Production Application integrating all 3 developers' modules
└── docs/                                 # Canonical shared architecture, DB schema, API contracts, deployment, testing & SimilarWeb docs
```

## Developer Module Allocation & Local Ports

| Workspace | Owner | Modules | Client Port | API Port |
| --- | --- | --- | --- | --- |
| `Person-1-Citizen-Management` | Person 1 | Auth, Citizen Portal, Complaints, Gemini Categorization, Duplicate Detection, Chatbot | `5171` | `4001` |
| `Person-2-Collection-Fleet-Management` | Person 2 | Sanitation Workers, Vehicles & Fleet, Tasks, Zones, Vehicle Recommendation, GPS Tracking | `5172` | `4002` |
| `Person-3-Administration-Analytics` | Person 3 | Admin Dashboard, Gemini Priority, Notifications, Escalation, Recharts Analytics, Hotspots, Audit & Reports | `5173` | `4003` |
| `Smart-Waste-Management-Full-Application` | Integrated Team | Complete Unified System (All 4 User Roles + End-to-End Workflows + Seed Data) | `5170` | `4000` |

## Shared Architecture Highlights

- **Free-Tier Serverless Ready**: Designed for Vercel Hobby Plan (`api/index.js` single serverless Express entry + `api/cron/escalate.js` daily cron) and MongoDB Atlas M0 Free Tier. Zero Docker, Render, Railway, or paid services.
- **Shared 9-Collection MongoDB Schema**: `users`, `complaints`, `workers`, `vehicles`, `collectionTasks`, `collectionZones`, `notifications`, `escalations`, `auditLogs`. See [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).
- **Shared REST API Contracts**: Consistent `{ success, data, error, meta }` envelope across `/api/*`. See [docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md).
- **Safe Gemini AI Integration**: Backend-only `@google/genai` (`gemini-3-flash-preview`) with Zod schema validation, rule-based guardrails, and deterministic fallbacks when `GEMINI_API_KEY` is absent or rate-limited.

## Quick Start (Any Workspace)

```bash
cd Smart-Waste-Management-Full-Application   # or any Person-* folder
cp .env.example .env
npm install
npm run seed    # available in Full Application
npm run dev     # runs Vite frontend + local Express API concurrently
npm test        # runs Vitest + Supertest integration suite
```
