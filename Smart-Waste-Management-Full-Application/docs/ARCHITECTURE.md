# System Architecture — CivicClean SWM

## End-to-End Integrated Flow

```text
Citizen submits text complaint
  ├── POST /api/ai/categorize (Gemini structured JSON + fallback)
  ├── POST /api/complaints/check-duplicates ($nearSphere 500m + Jaccard + Gemini context)
  └── POST /api/complaints
        ├── Auto-matches CollectionZone via $geoIntersects
        ├── Auto-estimates AI Priority + safety rules + SLA deadline
        ├── Dispatches Citizen + Admin notifications
        └── Records AuditLog

Admin reviews & dispatches
  ├── POST /api/vehicles/recommend (Deterministic capacity/distance/category scorer)
  └── POST /api/tasks (Links Complaint + Worker + Vehicle + notifies all parties)

Worker & Vehicle Operator execute
  ├── PATCH /api/tasks/:id/accept & /status (en_route -> in_progress -> completed)
  ├── PATCH /api/vehicles/:id/location (Live GPS trail -> Leaflet OpenStreetMap)
  └── Completion resolves Complaint, marks Escalations resolved, notifies Citizen

Analytics & SLA Governance
  ├── GET /api/analytics/* (MongoDB aggregation pipelines -> Recharts)
  ├── GET /api/analytics/hotspots (Spatial cluster grid -> Leaflet CircleMarkers)
  └── GET /api/cron/escalate & POST /api/admin/escalations/run (Overdue SLA scanner)
```

## Vercel Hobby Serverless Design
- `api/index.js` exports the Express app with zero persistent server processes.
- `api/cron/escalate.js` runs daily (`0 6 * * *`) on Vercel Hobby cron.
- `server/shared/config/db.js` caches Mongoose connections on `globalThis.__swmMongooseCache`.
