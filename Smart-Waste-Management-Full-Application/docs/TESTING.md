# Testing Strategy & Verification Matrix

Each workspace includes an isolated Vitest + Supertest integration test suite (`tests/*.test.js`) backed by MongoDB, following the **Arrange-Act-Assert (AAA)** pattern (`tdd-workflow`).

## Running Tests

```bash
# Inside any workspace folder:
npm run typecheck   # TypeScript verification across client/src
npm run build       # Production Vite bundle verification -> dist/
npm test            # Vitest API + database integration tests
```

## Coverage Matrix Across Workspaces

| Workspace | Test File | Verified Scenarios |
| --- | --- | --- |
| **Person 1** | `tests/person1.test.js` | User registration, bcrypt password hashing, JWT login/me/profile update, RBAC denial, text complaint creation with GeoJSON, Gemini categorization validation & fallback, duplicate detection (text + 500m `$nearSphere`, non-blocking), citizen chatbot, notifications |
| **Person 2** | `tests/person2.test.js` | Worker registration & availability toggle, vehicle CRUD & live GPS update (`locationHistory`), GeoJSON zone creation & `$geoWithin` complaint filtering, deterministic vehicle recommendation ranking & capacity/category filtering, task creation/accept/reject/complete lifecycle |
| **Person 3** | `tests/person3.test.js` | Gemini priority estimation + safety rule enforcement + admin override, automatic SLA escalation & cooldown anti-duplication, real MongoDB analytics aggregations (summary, trends, zones, fleet, workers), geospatial hotspots, notifications, immutable audit logs & RBAC denial logging, CSV report export |
| **Full Application** | `tests/full-app.test.js` | Full cross-module workflow: Citizen registers & categorizes via AI -> submits complaint (auto-zone linked + duplicate checked + AI prioritized) -> Admin runs vehicle recommender & dispatches task -> Worker accepts & completes -> Operator updates GPS -> Citizen & Admin receive notifications -> Overdue complaint escalates -> Analytics, Hotspots & Audit Logs reflect real DB state |
