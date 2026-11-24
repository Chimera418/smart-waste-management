import mongoose from 'mongoose';
import {
  COMPLAINT_STATUSES,
  PRIORITY_LEVELS,
  WASTE_CATEGORIES
} from '../config/constants.js';

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: { type: String, required: true, unique: true, index: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    wasteCategory: { type: String, enum: WASTE_CATEGORIES, required: true, index: true },
    aiCategorization: {
      suggestedCategory: { type: String, enum: WASTE_CATEGORIES },
      confidence: { type: Number, min: 0, max: 1 },
      issueType: { type: String, default: '' },
      summary: { type: String, default: '' },
      keywords: [{ type: String }],
      userAccepted: { type: Boolean, default: true },
      modelUsed: { type: String, default: 'fallback-rules' },
      fallbackUsed: { type: Boolean, default: false }
    },
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
    estimatedWeightKg: { type: Number, default: 50, min: 1 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    address: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
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
    duplicateAnalysis: {
      isPotentialDuplicate: { type: Boolean, default: false },
      highestSimilarity: { type: Number, default: 0 },
      candidates: [
        {
          complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
          complaintCode: { type: String },
          similarityScore: { type: Number },
          distanceMeters: { type: Number },
          reason: { type: String }
        }
      ],
      reviewedByAdmin: { type: Boolean, default: false }
    },
    assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionTask' },
    slaDeadline: { type: Date, index: true },
    escalationLevel: { type: Number, min: 0, max: 3, default: 0 },
    lastEscalatedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { timestamps: true, optimisticConcurrency: true }
);

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ title: 'text', description: 'text', address: 'text' });

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
