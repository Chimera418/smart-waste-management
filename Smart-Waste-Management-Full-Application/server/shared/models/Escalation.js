import mongoose from 'mongoose';
import { PRIORITY_LEVELS } from '../config/constants.js';

const escalationSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    complaintCode: { type: String, required: true },
    previousPriority: { type: String, enum: PRIORITY_LEVELS, required: true },
    newPriority: { type: String, enum: PRIORITY_LEVELS, required: true },
    escalationLevel: { type: Number, min: 1, max: 3, required: true },
    reason: { type: String, required: true },
    overdueMinutes: { type: Number, default: 0 },
    triggeredBy: { type: String, enum: ['system_cron', 'admin_manual'], default: 'system_cron' },
    notifiedAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Escalation = mongoose.models.Escalation || mongoose.model('Escalation', escalationSchema);
