# Shared MongoDB Database Schema (`CivicClean SWM`)

All four workspaces share identical collection names, enums, GeoJSON coordinate formats (`[longitude, latitude]`), timestamps, and index definitions so Person 1, Person 2, and Person 3 integrate seamlessly into `Smart-Waste-Management-Full-Application`.

## Collections Overview

| # | Collection | Model | Primary Responsibility | Key Indexes |
| --- | --- | --- | --- | --- |
| 1 | `users` | `User` | Accounts & RBAC (`citizen`, `worker`, `vehicle_operator`, `admin`) | `email` (unique), `role` |
| 2 | `collectionZones` | `CollectionZone` | Municipal GeoJSON polygons & zone resource links | `code` (unique), `boundary` (`2dsphere`) |
| 3 | `workers` | `Worker` | Sanitation worker profiles, availability, shifts, metrics | `userId` (unique), `employeeCode` (unique), `currentLocation` (`2dsphere`) |
| 4 | `vehicles` | `Vehicle` | Fleet vehicles, capacity, operator link, GPS trail | `registrationNumber` (unique), `currentLocation` (`2dsphere`), `status` |
| 5 | `complaints` | `Complaint` | Citizen text complaints, AI categorization/priority, duplicates, SLA | `complaintCode` (unique), `location` (`2dsphere`), `status`, `slaDeadline` |
| 6 | `collectionTasks` | `CollectionTask` | Dispatched worker + vehicle assignments & lifecycle | `taskCode` (unique), `complaintId`, `assignedWorkerId`, `status` |
| 7 | `notifications` | `Notification` | In-app, email, and optional Firebase notification records | `recipientId`, `isRead`, `createdAt` |
| 8 | `escalations` | `Escalation` | Overdue SLA escalation history & anti-spam cooldown records | `complaintId`, `escalationLevel` |
| 9 | `auditLogs` | `AuditLog` | Immutable security, RBAC denial, and admin action logs | `actorId`, `action`, `createdAt` |

## Shared Enums & GeoJSON Format

- **User Roles**: `citizen | worker | vehicle_operator | admin`
- **Waste Categories**: `organic | recyclable | plastic | electronic | hazardous | construction | medical | mixed | other`
- **Complaint Statuses**: `submitted | under_review | assigned | in_progress | resolved | rejected`
- **Priority Levels**: `low | medium | high | critical`
- **Task Statuses**: `assigned | accepted | rejected | en_route | in_progress | completed | cancelled`
- **Worker Availability**: `available | on_duty | on_break | off_duty`
- **Vehicle Types**: `compactor | tipper | mini_truck | hazmat_van | e_rickshaw`
- **Vehicle Statuses**: `available | assigned | in_transit | maintenance | inactive`
- **GeoJSON Point**: `{ type: "Point", coordinates: [longitude, latitude] }`
- **GeoJSON Polygon**: `{ type: "Polygon", coordinates: [[[lng, lat], ...]] }` (closed ring)

## Detailed Collection Schemas

### 1. `users`
- `name` (String, required)
- `email` (String, required, unique, lowercase)
- `passwordHash` (String, required, `select: false`, bcrypt hashed)
- `role` (String enum, default `citizen`)
- `phone` (String)
- `address` (String)
- `isActive` (Boolean, default `true`)
- `lastLoginAt` (Date)
- `timestamps`: `createdAt`, `updatedAt`

### 2. `collectionZones`
- `name` (String, required)
- `code` (String, required, unique)
- `description` (String)
- `wardNumber` (String)
- `boundary` (GeoJSON `Polygon`, required, `2dsphere` index)
- `center` (GeoJSON `Point`, required)
- `assignedWorkers` (`[ObjectId -> Worker]`)
- `assignedVehicles` (`[ObjectId -> Vehicle]`)
- `populationEstimate` (Number, default `0`)
- `isActive` (Boolean, default `true`)

### 3. `workers`
- `userId` (ObjectId -> `User`, required, unique)
- `employeeCode` (String, required, unique)
- `assignedZoneId` (ObjectId -> `CollectionZone`)
- `availability` (enum, default `available`)
- `shift` (`morning | afternoon | night`, default `morning`)
- `skills` (`[String]`)
- `activeTaskCount` (Number, default `0`)
- `completedTasksCount` (Number, default `0`)
- `currentLocation` (GeoJSON `Point`, `2dsphere` index)
- `phone` (String)

### 4. `vehicles`
- `registrationNumber` (String, required, unique)
- `name` (String, required)
- `type` (enum, required)
- `supportedWasteCategories` (`[String]`)
- `capacityKg` (Number, required, min `50`)
- `currentLoadKg` (Number, default `0`)
- `status` (enum, default `available`)
- `operatorId` (ObjectId -> `User`)
- `assignedZoneId` (ObjectId -> `CollectionZone`)
- `currentLocation` (GeoJSON `Point`, `2dsphere` index)
- `locationUpdatedAt` (Date)
- `locationHistory` (`[{ coordinates: [Number, Number], speedKmh: Number, heading: Number, recordedAt: Date }]`, capped at last 50 entries)
- `totalTripsCompleted` (Number, default `0`)
- `totalWasteCollectedKg` (Number, default `0`)

### 5. `complaints`
- `complaintCode` (String, required, unique, e.g. `SWM-2026-0001`)
- `citizenId` (ObjectId -> `User`, required)
- `title` (String, required)
- `description` (String, required, text-indexed)
- `wasteCategory` (enum, required)
- `aiCategorization`: `{ suggestedCategory, confidence, issueType, summary, keywords, userAccepted, modelUsed, fallbackUsed }`
- `priority` (enum, default `medium`)
- `aiPriority`: `{ suggestedPriority, score, reasoning, ruleAdjustments, overriddenByAdmin, overrideReason, overriddenBy, modelUsed, fallbackUsed }`
- `estimatedWeightKg` (Number, default `50`)
- `location` (GeoJSON `Point`, required, `2dsphere` index)
- `address` (String, required)
- `landmark` (String)
- `zoneId` (ObjectId -> `CollectionZone`)
- `status` (enum, default `submitted`)
- `statusHistory`: `[{ status, note, changedBy, changedAt }]`
- `duplicateAnalysis`: `{ isPotentialDuplicate, highestSimilarity, candidates: [{ complaintId, complaintCode, similarityScore, distanceMeters, reason }], reviewedByAdmin }`
- `assignedTaskId` (ObjectId -> `CollectionTask`)
- `slaDeadline` (Date, indexed)
- `escalationLevel` (Number, min `0`, max `3`, default `0`)
- `lastEscalatedAt` (Date)
- `resolvedAt` (Date)
- `optimisticConcurrency`: enabled (`__v` version check on concurrent updates)

### 6. `collectionTasks`
- `taskCode` (String, required, unique)
- `complaintId` (ObjectId -> `Complaint`, required)
- `zoneId` (ObjectId -> `CollectionZone`)
- `assignedWorkerId` (ObjectId -> `Worker`, required)
- `assignedVehicleId` (ObjectId -> `Vehicle`, required)
- `assignedBy` (ObjectId -> `User`, required)
- `status` (enum, default `assigned`)
- `priority` (enum, default `medium`)
- `instructions` (String)
- `rejectionReason` (String)
- `collectedWeightKg` (Number, default `0`)
- `completionNotes` (String)
- `recommendationSnapshot`: `{ score, distanceKm, reason }`
- `statusHistory`: `[{ status, note, updatedBy, updatedAt }]`
- `scheduledFor`, `acceptedAt`, `startedAt`, `completedAt` (Dates)

### 7. `notifications`
- `recipientId` (ObjectId -> `User`, required, indexed)
- `recipientRole` (String)
- `type` (enum, required)
- `title` (String, required)
- `message` (String, required)
- `relatedEntityType` (String)
- `relatedEntityId` (ObjectId)
- `isRead` (Boolean, default `false`, indexed)
- `emailSent` (Boolean, default `false`)

### 8. `escalations`
- `complaintId` (ObjectId -> `Complaint`, required, indexed)
- `complaintCode` (String)
- `previousPriority` (enum)
- `newPriority` (enum)
- `escalationLevel` (Number, min `1`, max `3`)
- `reason` (String, required)
- `overdueMinutes` (Number)
- `triggeredBy` (`system_cron | admin_manual`)
- `notifiedAdmins` (`[ObjectId -> User]`)
- `resolved` (Boolean, default `false`)

### 9. `auditLogs`
- `actorId` (ObjectId -> `User`)
- `actorEmail` (String)
- `actorRole` (String)
- `action` (String, required)
- `resourceType` (String, required)
- `resourceId` (String)
- `status` (`success | failure | denied`, default `success`)
- `ipAddress` (String)
- `userAgent` (String)
- `metadata` (Mixed)
