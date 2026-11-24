import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: 'anonymous' },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: '' },
    status: { type: String, enum: ['success', 'failure', 'denied'], default: 'success' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, collection: 'auditLogs' }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
