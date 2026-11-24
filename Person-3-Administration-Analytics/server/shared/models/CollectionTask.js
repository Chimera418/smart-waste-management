import mongoose from 'mongoose';
import { PRIORITY_LEVELS, TASK_STATUSES } from '../config/constants.js';

const collectionTaskSchema = new mongoose.Schema(
  {
    taskCode: { type: String, required: true, unique: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone' },
    assignedWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'assigned', index: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'medium' },
    collectedWeightKg: { type: Number, default: 0 },
    completedAt: { type: Date }
  },
  { timestamps: true, collection: 'collectionTasks' }
);

export const CollectionTask =
  mongoose.models.CollectionTask || mongoose.model('CollectionTask', collectionTaskSchema);
