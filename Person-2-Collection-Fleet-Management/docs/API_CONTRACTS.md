# Person 2 — API Contracts Reference

See canonical root contracts in `../docs/API_CONTRACTS.md`.
Active endpoints in `Person-2-Collection-Fleet-Management`:
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/workers`, `GET /api/workers/me`, `PATCH /api/workers/:id/availability`, `GET /api/workers/:id/history`
- `GET/POST /api/vehicles`, `GET /api/vehicles/tracking`, `POST /api/vehicles/recommend`, `PATCH /api/vehicles/:id/location`
- `GET/POST /api/tasks`, `PATCH /api/tasks/:id/accept`, `PATCH /api/tasks/:id/reject`, `PATCH /api/tasks/:id/status`
- `GET/POST /api/zones`, `GET /api/zones/:id/complaints`, `GET /api/zones/:id/progress`
