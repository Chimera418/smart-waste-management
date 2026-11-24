# Shared REST API Contracts (`CivicClean SWM`)

All four workspaces implement these unified REST conventions, response envelopes, authentication headers, and status codes.

## Response Envelope

### Success
```json
{
  "success": true,
  "message": "Optional human-readable summary",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [],
    "requestId": "req_1732420000_ab12cd"
  }
}
```

## Authentication & Authorization
- Header: `Authorization: Bearer <JWT>`
- Roles: `citizen`, `worker`, `vehicle_operator`, `admin`

## Endpoint Catalog

| Prefix | Method & Path | Roles | Description |
| --- | --- | --- | --- |
| `/api/health` | `GET /api/health` | Public | Database status and runtime health check |
| `/api/auth` | `POST /api/auth/register` | Public | Register user (`citizen`, `worker`, `vehicle_operator`, `admin`) |
| | `POST /api/auth/login` | Public | Authenticate and receive JWT + user profile |
| | `POST /api/auth/logout` | Auth | Stateless logout acknowledgement + audit log |
| | `GET /api/auth/me` | Auth | Fetch authenticated user profile (plus worker profile if worker) |
| | `PATCH /api/auth/profile` | Auth | Update name, phone, address |
| `/api/users` | `GET /api/users` | Admin (or self) | List users with optional `role` filter |
| `/api/complaints` | `GET /api/complaints` | Auth | List complaints (citizens see own; admin/worker/operator see operational feed) |
| | `POST /api/complaints` | Citizen, Admin | Submit text-first waste complaint with GeoJSON location + duplicate check |
| | `POST /api/complaints/check-duplicates` | Auth | Check nearby (`$nearSphere` 500m) + textual similarity candidates |
| | `GET /api/complaints/:id` | Auth | View single complaint + timeline + duplicate analysis |
| `/api/ai` | `POST /api/ai/categorize` | Auth | Gemini structured JSON waste categorization (with safe fallback) |
| | `POST /api/ai/chat` | Auth | Gemini citizen waste assistant chatbot |
| | `POST /api/ai/priority` | Admin | Gemini priority estimation + deterministic rule validation |
| `/api/workers` | `GET /api/workers` | Admin, Worker | List sanitation workers |
| | `POST /api/workers` | Admin | Register/create sanitation worker profile |
| | `GET /api/workers/me` | Worker | Current worker profile + stats |
| | `GET /api/workers/:id` | Admin, Self | Worker details |
| | `PATCH /api/workers/:id` | Admin | Update worker zone, shift, skills |
| | `PATCH /api/workers/:id/availability` | Worker, Admin | Update availability (`available | on_duty | on_break | off_duty`) |
| | `GET /api/workers/:id/history` | Worker, Admin | Completed & historical tasks |
| `/api/vehicles` | `GET /api/vehicles` | Admin, Operator, Worker | List fleet vehicles |
| | `POST /api/vehicles` | Admin | Register new collection vehicle |
| | `GET /api/vehicles/tracking` | Admin, Operator, Worker | Live vehicle coordinates, active tasks, and zone context |
| | `POST /api/vehicles/recommend` | Admin | Deterministic vehicle recommendation algorithm (+ optional Gemini explanation) |
| | `GET /api/vehicles/:id` | Auth | Vehicle details |
| | `PATCH /api/vehicles/:id` | Admin | Update vehicle metadata, status, or assigned zone/operator |
| | `PATCH /api/vehicles/:id/location` | Operator, Admin | Update live GPS coordinates (`[lng, lat]`) and trail |
| `/api/tasks` | `GET /api/tasks` | Admin, Worker, Operator | List tasks scoped by role |
| | `POST /api/tasks` | Admin | Create collection task assigning worker + vehicle to complaint |
| | `GET /api/tasks/:id` | Admin, Worker, Operator | Task detail |
| | `PATCH /api/tasks/:id/accept` | Worker, Admin | Worker accepts task |
| | `PATCH /api/tasks/:id/reject` | Worker, Admin | Worker rejects task with reason |
| | `PATCH /api/tasks/:id/status` | Worker, Operator, Admin | Advance task (`en_route`, `in_progress`, `completed`) & sync complaint |
| `/api/zones` | `GET /api/zones` | Auth | List GeoJSON collection zones |
| | `POST /api/zones` | Admin | Create collection zone polygon |
| | `GET /api/zones/:id` | Auth | Zone detail |
| | `PATCH /api/zones/:id` | Admin | Update zone / assign workers & vehicles |
| | `DELETE /api/zones/:id` | Admin | Deactivate/delete zone |
| | `GET /api/zones/:id/complaints` | Admin, Worker, Operator | Complaints falling inside zone (`$geoWithin`) |
| | `GET /api/zones/:id/progress` | Admin, Worker | Zone completion metrics |
| `/api/notifications` | `GET /api/notifications` | Auth | List user notifications + unread count |
| | `PATCH /api/notifications/:id/read` | Auth | Mark single notification read |
| | `PATCH /api/notifications/read-all` | Auth | Mark all user notifications read |
| `/api/analytics` | `GET /api/analytics/summary` | Admin | System-wide KPIs via MongoDB aggregations |
| | `GET /api/analytics/trends` | Admin | Daily waste generation & resolution trends |
| | `GET /api/analytics/zones` | Admin | Zone-wise complaint & efficiency aggregations |
| | `GET /api/analytics/fleet` | Admin | Vehicle utilization & load aggregations |
| | `GET /api/analytics/workers` | Admin | Worker workload & completion aggregations |
| | `GET /api/analytics/hotspots` | Admin | Geospatial hotspot clusters + zone density |
| `/api/admin` | `GET /api/admin/overview` | Admin | Command center summary |
| | `GET /api/admin/users` | Admin | List & filter registered users |
| | `PATCH /api/admin/users/:id/status` | Admin | Activate/deactivate user account |
| | `PATCH /api/admin/complaints/:id/priority` | Admin | Override or approve complaint priority with audit trail |
| | `GET /api/admin/escalations` | Admin | List escalation records & overdue complaints |
| | `POST /api/admin/escalations/run` | Admin | Execute automatic escalation scan |
| | `GET /api/admin/audit-logs` | Admin | Filterable security & admin audit trail |
| | `GET /api/admin/reports/export` | Admin | Export operational CSV or JSON report |
| `/api/cron/escalate` | `GET /api/cron/escalate` | Vercel Cron / `CRON_SECRET` | Scheduled Hobby-compatible escalation runner |
