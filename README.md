# CivicClean SWM — Smart Waste Management System

> **New here?** Read the complete end-to-end walkthrough, Mermaid workflow diagrams, live GPS tracking guide, and presentation demo script in **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)**.

A production-quality, Vercel Hobby Free-Plan compatible Full Stack Smart Waste Management System built with **React 19, TypeScript, Vite, Tailwind CSS v4, Express.js, MongoDB (GeoJSON + `2dsphere` + Aggregations), Leaflet + CARTO Maps, Recharts v3, Resend API / Nodemailer + Browser Push Alerts, and `@google/genai`**.

## Individual Developer & Application Guides

Each workspace includes its own complete README covering **assigned features, exact UI routes & roles, backend API endpoints, tech stack per feature, setup commands, and viva demo steps**:

| Workspace | Owner | Individual Guide | Key Features | Client Port | API Port |
| --- | --- | --- | --- | --- | --- |
| `Person-1-Citizen-Management` | **Person 1** | [Person 1 README](./Person-1-Citizen-Management/README.md) | Auth & RBAC, Citizen Portal, Text-First Complaints + GPS Map Pinning, AI Categorizer, Duplicate Detection, Persistent Action Chatbot, Notifications | `5171` | `4001` |
| `Person-2-Collection-Fleet-Management` | **Person 2** | [Person 2 README](./Person-2-Collection-Fleet-Management/README.md) | Sanitation Worker Console, Vehicle Operator GPS Console, Fleet Registry, GeoJSON Zones, Weighted Vehicle Recommender, Task Dispatch, Live GPS Map | `5172` | `4002` |
| `Person-3-Administration-Analytics` | **Person 3** | [Person 3 README](./Person-3-Administration-Analytics/README.md) | Admin Command Center, AI Priority & Overrides, Notifications & Email, Automatic SLA Escalation + Vercel Cron, Recharts Analytics, Geospatial Hotspots, Immutable Audit Logs, CSV/JSON Reports | `5173` | `4003` |
| `Smart-Waste-Management-Full-Application` | **Integrated Team** | [Full App README](./Smart-Waste-Management-Full-Application/README.md) | All 4 Roles Unified + Always-On Live Vehicle Simulation, CARTO Maps with Type-Accurate Vehicle Icons (Auto/Truck/Tipper/Hazmat), Resend Real Email + Browser Push Alerts, Fast Hybrid Chatbot | `5170` | `4000` |

## Shared Architecture Highlights

- **Free-Tier Serverless Ready**: Designed for Vercel Hobby Plan (`api/index.js` single serverless Express entry + `api/cron/escalate.js` daily cron) and MongoDB Atlas M0 Free Tier. Zero Docker, Render, Railway, or paid services.
- **Shared 10-Collection MongoDB Schema**: `users`, `complaints`, `workers`, `vehicles`, `collectionTasks`, `collectionZones`, `notifications`, `escalations`, `auditLogs`, `chatMessages`. See [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).
- **Shared REST API Contracts**: Consistent `{ success, data, error, meta }` envelope across `/api/*`. See [docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md).
- **Resilient AI & Notifications**: Backend-only `@google/genai` with fast predefined matching, Zod validation, safety guardrails, and deterministic fallbacks; Resend API primary email delivery with SMTP/Ethereal fallback + native Browser Push notifications.

## Quick Start (Any Workspace)

```bash
cd Smart-Waste-Management-Full-Application   # or any Person-* folder
cp .env.example .env
npm install
npm run seed    # available in Full Application (Demo@1234)
npm run dev     # runs Vite frontend + local Express API concurrently
npm test        # runs Vitest + Supertest integration suite
```
