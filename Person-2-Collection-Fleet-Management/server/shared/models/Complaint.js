import mongoose from 'mongoose';
import { COMPLAINT_STATUSES, PRIORITY_LEVELS, WASTE_CATEGORIES } from '../config/constants.js';

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: { type: String, required: true, unique: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    wasteCategory: { type: String, enum: WASTE_CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'medium' },
    estimatedWeightKg: { type: Number, default: 50 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }
    },
    address: { type: String, required: true },
    landmark: { type: String, default: '' },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone', index: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'submitted', index: true },
    statusHistory: [
      {
        status: { type: String, enum: COMPLAINT_STATUSES, required: true },
        note: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now }
      }
    ],
    assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionTask' },
    resolvedAt: { type: Date }
  },
  { timestamps: true, optimisticConcurrency: true }
);

complaintSchema.index({ location: '2dsphere' });

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
