# Person 2 Workspace — Collection & Fleet Management

Independent development workspace for **Developer 2** in the **CivicClean SWM** Smart Waste Management System.

## Assigned Modules
1. **Sanitation Worker Management**: Worker registration, authentication, availability toggles, assigned tasks, accept/reject, collection history.
2. **Vehicle & Fleet Management**: Vehicle registration, operator assignment, capacity/load utilization tracking, status updates.
3. **Collection Task Management**: Dispatch tasks with worker + vehicle, track `assigned -> accepted -> en_route -> in_progress -> completed`, sync complaint status.
4. **Collection Zone Management**: GeoJSON `Polygon` zones, `$geoWithin` complaint lookup, zone progress metrics.
5. **Intelligent Vehicle Recommendation**: Deterministic weighted scoring (capacity, distance, availability, waste type compatibility, active assignments) with optional Gemini explanation.
6. **GPS-Based Vehicle Tracking**: Live GPS coordinate updates (`locationHistory`), Leaflet + OpenStreetMap tracking board polling every 5s.

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev      # Frontend http://localhost:5172 + API http://127.0.0.1:4002
npm test         # Vitest + Supertest suite against mongodb://127.0.0.1:27017/swm_p2_test
npm run build    # Production Vite build -> dist/
```
