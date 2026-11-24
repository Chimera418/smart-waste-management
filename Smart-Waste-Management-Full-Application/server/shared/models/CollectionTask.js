import mongoose from 'mongoose';
import { PRIORITY_LEVELS, TASK_STATUSES } from '../config/constants.js';

const collectionTaskSchema = new mongoose.Schema(
  {
    taskCode: { type: String, required: true, unique: true, index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone', index: true },
    assignedWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'assigned', index: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'medium' },
    instructions: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    collectedWeightKg: { type: Number, default: 0, min: 0 },
    completionNotes: { type: String, default: '' },
    recommendationSnapshot: {
      score: { type: Number },
      distanceKm: { type: Number },
      reason: { type: String }
    },
    statusHistory: [
      {
        status: { type: String, enum: TASK_STATUSES, required: true },
        note: { type: String, default: '' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    scheduledFor: { type: Date },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    milestonesNotified: [{ type: String }]
  },
  { timestamps: true, collection: 'collectionTasks' }
);

export const CollectionTask =
  mongoose.models.CollectionTask || mongoose.model('CollectionTask', collectionTaskSchema);
