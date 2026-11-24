# Free-Tier Deployment Guide (Vercel Hobby + MongoDB Atlas M0)

## Allowed Free-Tier Stack
- **Frontend & Serverless API**: Vercel Hobby Free Plan
- **Database**: MongoDB Atlas M0 Free Tier (512MB, `2dsphere` & aggregation support)
- **AI**: Google Gemini API (`@google/genai` using `gemini-3-flash-preview`)
- **Maps**: OpenStreetMap tiles via Leaflet
- **Optional Email**: Nodemailer SMTP (Gmail App Password / Brevo free SMTP)
- **Optional Real-Time Signal**: Firebase Realtime Database free Spark tier (`FIREBASE_DATABASE_URL`)

## Serverless Architecture Decisions
1. **Single Express Serverless Entry (`api/index.js`)**: Exports the Express application directly without `app.listen()`. Vercel routes `/api/(.*)` to `api/index.js`, keeping function count well below the **Vercel Hobby 12-function limit**.
2. **Scheduled Escalation (`api/cron/escalate.js`)**: Configured in `vercel.json` with `"schedule": "0 6 * * *"` (once daily, compatible with Vercel Hobby cron limits) and secured with `CRON_SECRET`. Administrators can also trigger immediate scans from the UI via `POST /api/admin/escalations/run`.
3. **MongoDB Connection Reuse**: `server/shared/config/db.js` caches the Mongoose connection in `globalThis.__swmMongooseCache` to prevent Atlas M0 connection exhaustion across warm serverless invocations.
4. **No Persistent Sockets**: Real-time UI updates use structured polling (`usePolling`) plus optional Firebase Realtime Database signal writes.

## Required Environment Variables (Set in Vercel Project Settings)

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart_waste?retryWrites=true&w=majority
JWT_SECRET=<strong-random-secret>
GEMINI_API_KEY=<google-ai-studio-key>
GEMINI_MODEL=gemini-3-flash-preview
CRON_SECRET=<random-cron-token>
CORS_ORIGIN=https://your-project.vercel.app
```

## Deploying to Vercel

1. Push the chosen workspace (e.g., `Smart-Waste-Management-Full-Application`) to a GitHub repository.
2. Import the repository in Vercel Dashboard (Framework Preset: **Vite**, Build Command: `npm run build`, Output Directory: `dist`).
3. Add the environment variables above in **Settings -> Environment Variables**.
4. In MongoDB Atlas **Network Access**, allow `0.0.0.0/0` (required for dynamic Vercel serverless IPs).
5. Deploy and verify `/api/health`.

## Known Free-Tier Limitations
- **Vercel Hobby Function Timeout**: 10 seconds per invocation. All AI calls use tight timeouts with deterministic fallback so requests never hang.
- **Vercel Hobby Cron Frequency**: Maximum 1 scheduled run per day per cron job (`0 6 * * *`).
- **Gemini Free Tier Quotas**: Subject to RPM/RPD limits; graceful deterministic fallbacks ensure core operations never block.
- **MongoDB Atlas M0**: 512MB storage and shared CPU; keep `locationHistory` capped at 50 points per vehicle.
