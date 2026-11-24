# Person 1 Module Architecture Guide

## Directory Overview
- `client/src/pages/`: Citizen Portal (`CitizenDashboardPage`), Complaint Submission (`SubmitComplaintPage`), History (`ComplaintsHistoryPage`), Chatbot (`ChatbotPage`), Notifications (`NotificationsPage`), Profile (`ProfilePage`), Auth (`LoginPage`, `RegisterPage`).
- `server/routes/`: `auth.js`, `users.js`, `complaints.js`, `notifications.js`, `ai.js`.
- `server/shared/services/geminiService.js`: Server-side `@google/genai` wrapper (`gemini-3-flash-preview`) with Zod validation and fallback.
- `server/shared/services/duplicateService.js`: Geo-proximity (`$nearSphere` 500m) + token similarity duplicate detection.
- `api/index.js`: Vercel Hobby serverless function export.
