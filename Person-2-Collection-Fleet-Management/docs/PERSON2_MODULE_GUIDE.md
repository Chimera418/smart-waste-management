# Person 2 Module Architecture Guide

- `server/shared/services/vehicleRecommendationService.js`: Deterministic fleet scorer enforcing capacity and hazardous-waste constraints before ranking by availability, Haversine distance, category match, zone match, and workload.
- `server/routes/workers.js`: Worker profiles, availability updates, task history.
- `server/routes/vehicles.js`: Fleet CRUD, `/recommend`, `/tracking`, and `/location` GPS trail updates.
- `server/routes/tasks.js`: Task assignment, acceptance/rejection, and completion syncing `Complaint` & `Notification`.
- `server/routes/zones.js`: GeoJSON `Polygon` CRUD, `$geoWithin` complaints query, and zone progress.
