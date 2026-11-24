# CivicClean SWM — Full Integrated Smart Waste Management System

> **Workspace**: `Smart-Waste-Management-Full-Application`  
> **Local URLs**: Frontend `http://localhost:5170` · Backend API `http://127.0.0.1:4000`  
> **Roles Supported**: `citizen`, `worker`, `vehicle_operator`, `admin`

This is the **complete unified production application** combining **Person 1 (Citizen Portal & Chatbot)**, **Person 2 (Collection, Workers, Fleet & Live GPS Tracking)**, and **Person 3 (Admin Governance, SLA Escalation, Analytics, Notifications & Audit)** — enhanced with **always-on fleet simulation**, **Resend real email + Browser Push alerts**, **CARTO basemaps with realistic vehicle icons**, and a **fast hybrid Waste Assistant**.

---

## 1. Seeded Demo Accounts (Password: `Demo@1234`)

Run `npm run seed` once to populate all 4 roles, 3 Bengaluru GeoJSON collection zones, 4 fleet vehicles (`KA-01-SW-101` Compactor, `KA-01-HZ-204` Hazmat Van, `KA-01-TP-309` Tipper Truck, `KA-01-EV-412` E-Auto), sample complaints, and tasks.

| Role | Email | Default Home Route |
| --- | --- | --- |
| **Citizen** | `citizen@civicclean.org` | `/citizen` |
| **Sanitation Worker** | `worker@civicclean.org` | `/worker` |
| **Vehicle Operator** | `operator@civicclean.org` | `/operator` |
| **Municipal Admin** | `admin@civicclean.org` | `/admin` |

*(You can also register any new email at `/register` — Resend sends real email alerts directly to your registered email address.)*

---

## 2. Complete Feature Matrix (Access, Roles & Tech Stack)

### Citizen Features (Person 1 + Live Tracking Integration)

| Feature | How to Access (UI Path & Role) | API Endpoint(s) | Tech Stack Used |
| --- | --- | --- | --- |
| **Citizen Dashboard** | `citizen` → **Citizen Dashboard** (`/citizen`) | `GET /api/complaints` | React 19, TypeScript, Tailwind CSS v4, Lucide React |
| **Submit Waste Complaint + Map Pin + AI Categorizer + Duplicate Check** | `citizen` → **Submit Complaint** (`/complaints/new`) | `POST /api/ai/categorize`<br>`POST /api/complaints/check-duplicates`<br>`POST /api/complaints` | React-Leaflet v5 + **CARTO Voyager** tiles, Browser Geolocation, `@google/genai` + Zod + deterministic fallback, MongoDB `2dsphere` (`$geoIntersects` / `$nearSphere`) |
| **My Complaints + Live Approaching Vehicle Map** | `citizen` → **My Complaints** (`/complaints`) — select any assigned complaint to watch your assigned truck/auto approach live with ETA, speed, heading, and milestone stepper | `GET /api/complaints`<br>`GET /api/complaints/:id/tracking` | Leaflet + **CARTO Voyager / Dark Ops** tiles, custom type-accurate SVG vehicle markers (`mapIcons.ts`), 1s polling + smooth CSS marker gliding, Haversine ETA calculation |
| **Fast Hybrid Citizen Waste Assistant** | `citizen` → **Waste Assistant** (`/chatbot`) — check statuses, file complaints in plain English, or ask disposal questions (persists across reloads) | `GET /api/ai/chat/history`<br>`POST /api/ai/chat`<br>`DELETE /api/ai/chat/history` | **~15 ms predefined intent/FAQ fast-path** + fast LLM (`@google/genai` with `thinkingBudget: 0` & Zod JSON schema) for open-ended queries, MongoDB `chatMessages` persistence |

### Collection & Fleet Features (Person 2 + Always-On Simulation)

| Feature | How to Access (UI Path & Role) | API Endpoint(s) | Tech Stack Used |
| --- | --- | --- | --- |
| **Admin Complaints, AI Priority & Task Dispatch** | `admin` → **Complaints & Dispatch** (`/admin/dispatch`) — inspect assigned worker/vehicle per complaint, run AI Priority, override priority, run Vehicle Recommender & dispatch/reassign | `POST /api/ai/priority`<br>`PATCH /api/admin/complaints/:id/priority`<br>`POST /api/vehicles/recommend`<br>`POST /api/tasks` | `@google/genai` + `$geoWithin` (`$centerSphere`) density + safety rules, deterministic weighted Vehicle Recommender, auto-cancels superseded tasks on reassign |
| **Workers & Fleet Registry** | `admin` → **Workers & Fleet** (`/fleet`) | `GET/POST /api/workers`<br>`GET/POST/PATCH /api/vehicles` | Express.js, Mongoose, Zod, Tailwind CSS v4 |
| **GeoJSON Collection Zones** | `admin` → **Collection Zones** (`/zones`) | `GET/POST /api/zones`<br>`GET /api/zones/:id/complaints` | MongoDB GeoJSON `Polygon` + `$geoWithin` |
| **Always-On Live GPS Fleet Operations Map** | `admin`, `vehicle_operator` → **Live GPS Map** (`/tracking`) — live moving vehicles with CARTO layer switcher, HUD counters, Pause/Resume, click-to-fly telemetry | `GET /api/vehicles/tracking`<br>`POST /api/vehicles/simulate-step`<br>`POST /api/vehicles/simulation-toggle` | Always-on 1.2s backend simulation loop (`server/dev.js`) + Vercel serverless auto-step (`maybeAutoSimulateStep`), Bengaluru street-corridor waypoints, **CARTO Maps** (`Voyager`, `Dark Ops`, `Positron`, `OSM`), custom SVG icons (**E-Auto**, **Garbage Truck**, **Tipper Truck**, **Hazmat Van**, **Mini Truck**) |
| **Worker Console** | `worker` → **Worker Console** (`/worker`) | `GET/PATCH /api/workers/me*`<br>`PATCH /api/tasks/:id/*` | Express.js RBAC, Mongoose atomic lifecycle sync (resolves complaint & frees worker/vehicle) |
| **Operator GPS Console** | `vehicle_operator` → **Operator GPS Console** (`/operator`) | `PATCH /api/vehicles/:id/location`<br>`POST /api/vehicles/simulate-step` | Browser Geolocation API, live telemetry updates, auto-drive toggle |

### Administration, Alerts & Analytics Features (Person 3 + Resend & Web Push)

| Feature | How to Access (UI Path & Role) | API Endpoint(s) | Tech Stack Used |
| --- | --- | --- | --- |
| **Command Center** | `admin` → **Command Center** (`/admin`) | `GET /api/admin/overview` | MongoDB Aggregations, React 19, Tailwind CSS v4 |
| **Real-Time Email (Resend) + Browser Push + In-App Toasts** | Any role → **Notifications** (`/notifications`) + **"Enable Push Alerts"** in sidebar + **"Send Test Email & Push"** | `GET /api/notifications`<br>`POST /api/notifications/test-email`<br>`PATCH /api/notifications/*/read` | **Resend REST API** (`api.resend.com/emails`) primary transport, **Nodemailer** (SMTP / Ethereal fallback), native **Browser Notification API (`window.Notification`)**, 3s polling floating toasts in `AppShell.tsx` |
| **Analytics Dashboard** | `admin` → **Analytics Dashboard** (`/analytics`) | `GET /api/analytics/*` | **Recharts v3** (`AreaChart`, `BarChart`, `PieChart`) + MongoDB Aggregation Pipelines |
| **Geospatial Hotspot Map** | `admin` → **Geospatial Hotspots** (`/hotspots`) | `GET /api/analytics/hotspots` | Leaflet + **CARTO Voyager** tiles, server-side spatial grid clustering |
| **SLA Escalations & Daily Cron** | `admin` → **Escalations & SLA** (`/escalations`) | `GET/POST /api/admin/escalations*`<br>`GET /api/cron/escalate` | Vercel Cron (`vercel.json`), 6-hour cooldown, automatic priority escalation + email alert |
| **Security, Audit Logs & Report Exports** | `admin` → **Security & Audit** (`/audit`) & **Users & Reports** (`/reports`) | `GET /api/admin/audit-logs`<br>`GET/PATCH /api/admin/users*`<br>`GET /api/admin/reports/export` | Immutable MongoDB `auditLogs`, CSV/JSON streaming export, security headers & rate limiting |

---

## 3. Environment Configuration (`.env`)

Copy `.env.example` to `.env` and fill in your local values (never commit `.env`):

```env
MONGODB_URI=mongodb://127.0.0.1:27017/swm_full
JWT_SECRET=replace-with-strong-32-char-secret
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-3-flash-preview
CRON_SECRET=replace-with-cron-secret

# Real Email Delivery via Resend API (Primary)
RESEND_API_KEY=re_...
RESEND_FROM=CivicClean SWM <alerts@your-verified-domain>

# CARTO Basemaps Key (Frontend only — safe VITE_ prefix)
VITE_CARTO_API_KEY=your-carto-key

PORT=4000
CORS_ORIGIN=http://localhost:5170
```

---

## 4. Local Setup & Verification Commands

```bash
cd Smart-Waste-Management-Full-Application
cp .env.example .env
npm install
npm run seed       # Seeds demo accounts, zones, vehicles, complaints & tasks
npm run dev        # Frontend http://localhost:5170 + Auto-reloading API http://127.0.0.1:4000
npm run typecheck  # TypeScript strict check
npm run build      # Vite production bundle -> dist/
npm test           # End-to-end Vitest + Supertest integration suite
```

---

## 5. Additional Documentation
- [Master Project Guide & Demo Script](../PROJECT_GUIDE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Shared Database Schema](./docs/DATABASE_SCHEMA.md)
- [Shared API Contracts](./docs/API_CONTRACTS.md)
- [OpenAPI 3.0 Spec](./docs/openapi.json)
- [Testing Strategy](./docs/TESTING.md)
- [Vercel Free-Tier Deployment Guide](./docs/DEPLOYMENT.md)
- [SimilarWeb Benchmark Report](./docs/SIMILARWEB_ANALYSIS.md)
