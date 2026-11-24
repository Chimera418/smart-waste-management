# Person 3 — API Contracts Reference

See canonical root contracts in `../docs/API_CONTRACTS.md`.
Active endpoints in `Person-3-Administration-Analytics`:
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/admin/overview`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `PATCH /api/admin/complaints/:id/priority`, `GET /api/admin/escalations`, `POST /api/admin/escalations/run`, `GET /api/admin/audit-logs`, `GET /api/admin/reports/export`
- `GET /api/analytics/summary`, `/trends`, `/zones`, `/fleet`, `/workers`, `/hotspots`
- `POST /api/ai/priority`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- `GET /api/cron/escalate`
