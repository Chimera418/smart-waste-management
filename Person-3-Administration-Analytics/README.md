# Person 3 Workspace — Administration & Analytics

Independent development workspace for **Developer 3** in the **CivicClean SWM** Smart Waste Management System.

## Assigned Modules
1. **Municipal Administration Dashboard**: System-wide KPIs, registered citizens/workers/operators, zone count, recent escalations.
2. **Gemini-Powered Complaint Priority Estimation**: Evaluates description, category, location density (`$nearSphere`), and submission time with deterministic safety rules and admin overrides.
3. **Real-Time Notification System**: In-app notifications, Nodemailer email hook, optional Firebase Realtime DB signal.
4. **Automatic Complaint Escalation**: Overdue SLA detector with 6-hour anti-spam cooldown, Vercel Hobby daily cron (`/api/cron/escalate`), and admin alerts.
5. **Analytics Dashboard**: Recharts visualizations backed by MongoDB aggregation pipelines (trends, zones, categories, fleet, worker workload).
6. **Geospatial Hotspot Analysis**: Spatial grid clustering + zone density rendered on Leaflet/OpenStreetMap.
7. **Security & Audit Management**: Immutable `AuditLog` capturing auth events, RBAC denials, priority overrides, and escalation scans.
8. **Reporting & Documentation**: CSV/JSON report export, database/API/testing/deployment docs, and SimilarWeb benchmark report.

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev      # Frontend http://localhost:5173 + API http://127.0.0.1:4003
npm test         # Vitest + Supertest suite against mongodb://127.0.0.1:27017/swm_p3_test
npm run build    # Production Vite build -> dist/
```
