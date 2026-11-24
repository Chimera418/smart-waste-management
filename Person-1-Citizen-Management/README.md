# Person 1 Workspace — Citizen & Complaint Management

Independent development workspace for **Developer 1** in the **CivicClean SWM** Smart Waste Management System.

## Assigned Modules
1. **Authentication & User Management**: Registration, login, JWT authentication, bcrypt hashing, RBAC, profile management, logout.
2. **Citizen Portal**: Citizen dashboard, complaint summary, history, status timeline, notification viewer.
3. **Text-First Waste Complaint Management**: Natural-language complaint submission, GPS + Leaflet OpenStreetMap pinning, address/landmark capture.
4. **Gemini-Powered Waste Categorization**: Backend `@google/genai` integration returning structured JSON (`suggestedCategory`, `confidence`, `issueType`, `summary`, `keywords`), validated via Zod with user override support and deterministic fallback.
5. **Duplicate Complaint Detection**: MongoDB `$nearSphere` (500m) + lexical similarity + optional Gemini contextual check; warns without auto-rejecting.
6. **Citizen Chatbot**: Gemini-powered waste guidance assistant.

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev      # Frontend http://localhost:5171 + API http://127.0.0.1:4001
npm test         # Vitest + Supertest suite against mongodb://127.0.0.1:27017/swm_p1_test
npm run build    # Production Vite build -> dist/
```

## Documentation
- [Module Guide](./docs/PERSON1_MODULE_GUIDE.md)
- [Shared Database Schema](./docs/DATABASE_SCHEMA.md)
- [Shared API Contracts](./docs/API_CONTRACTS.md)
