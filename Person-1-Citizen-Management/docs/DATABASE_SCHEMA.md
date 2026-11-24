# Person 1 — Shared Database Schema Reference

See canonical root schema in `../docs/DATABASE_SCHEMA.md`.
Primary collections used by Person 1:
- `users` (`User`)
- `complaints` (`Complaint`, `2dsphere` index on `location`, text index on `title`, `description`, `address`)
- `notifications` (`Notification`)
- `collectionZones` (`CollectionZone`, used for `$geoIntersects` zone matching on complaint creation)
