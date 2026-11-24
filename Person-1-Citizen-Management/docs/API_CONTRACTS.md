# Person 1 — API Contracts Reference

See canonical root contracts in `../docs/API_CONTRACTS.md`.
Active endpoints in `Person-1-Citizen-Management`:
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`
- `GET /api/users` (admin only)
- `GET /api/complaints`, `POST /api/complaints`, `POST /api/complaints/check-duplicates`, `GET /api/complaints/:id`
- `POST /api/ai/categorize`, `POST /api/ai/chat`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
