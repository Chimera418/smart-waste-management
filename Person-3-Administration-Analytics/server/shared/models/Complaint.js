import mongoose from 'mongoose';
import { COMPLAINT_STATUSES, PRIORITY_LEVELS, WASTE_CATEGORIES } from '../config/constants.js';

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: { type: String, required: true, unique: true, index: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    wasteCategory: { type: String, enum: WASTE_CATEGORIES, required: true, index: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'medium', index: true },
    aiPriority: {
      suggestedPriority: { type: String, enum: PRIORITY_LEVELS },
      score: { type: Number, min: 0, max: 100 },
      reasoning: { type: String, default: '' },
      ruleAdjustments: [{ type: String }],
      overriddenByAdmin: { type: Boolean, default: false },
      overrideReason: { type: String, default: '' },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      modelUsed: { type: String, default: 'fallback-rules' },
      fallbackUsed: { type: Boolean, default: false }
    },
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
    slaDeadline: { type: Date, index: true },
    escalationLevel: { type: Number, min: 0, max: 3, default: 0 },
    lastEscalatedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { timestamps: true, optimisticConcurrency: true }
);

complaintSchema.index({ location: '2dsphere' });

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
