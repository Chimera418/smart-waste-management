# Person 3 Module Architecture Guide

- `server/shared/services/geminiPriorityService.js`: AI + safety-rule priority scoring and SLA deadline calculation.
- `server/shared/services/escalationService.js`: Overdue SLA escalation engine with anti-duplication cooldown.
- `server/shared/services/analyticsService.js`: MongoDB aggregation pipelines for trends, zones, fleet, workers, and geospatial hotspots.
- `server/shared/services/notificationService.js`: Notification persistence + optional Nodemailer SMTP + optional Firebase Realtime DB push.
- `server/shared/services/auditService.js`: Security & administrative audit trail recorder.
- `api/cron/escalate.js`: Vercel Hobby daily cron endpoint.
