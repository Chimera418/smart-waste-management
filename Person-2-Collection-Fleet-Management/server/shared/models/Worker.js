import mongoose from 'mongoose';
import { WORKER_AVAILABILITY, WORKER_SHIFTS } from '../config/constants.js';

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true, uppercase: true },
    assignedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone', index: true },
    availability: { type: String, enum: WORKER_AVAILABILITY, default: 'available', index: true },
    shift: { type: String, enum: WORKER_SHIFTS, default: 'morning' },
    skills: [{ type: String }],
    activeTaskCount: { type: Number, default: 0, min: 0 },
    completedTasksCount: { type: Number, default: 0, min: 0 },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] }
    },
    phone: { type: String, default: '' }
  },
  { timestamps: true }
);

workerSchema.index({ currentLocation: '2dsphere' });

export const Worker = mongoose.models.Worker || mongoose.model('Worker', workerSchema);
