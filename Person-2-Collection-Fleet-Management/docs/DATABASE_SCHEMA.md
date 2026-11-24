# Person 2 — Shared Database Schema Reference

See canonical root schema in `../docs/DATABASE_SCHEMA.md`.
Primary collections used by Person 2:
- `workers` (`Worker`, `2dsphere` on `currentLocation`)
- `vehicles` (`Vehicle`, `2dsphere` on `currentLocation`, capped `locationHistory`)
- `collectionZones` (`CollectionZone`, `2dsphere` on `boundary`)
- `collectionTasks` (`CollectionTask`)
- `complaints`, `users`, `notifications` (operational references)
