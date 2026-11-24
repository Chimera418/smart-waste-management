import { AuditLog } from '../models/AuditLog.js';

export async function recordAudit({
  actor = null,
  action,
  resourceType,
  resourceId = '',
  status = 'success',
  req = null,
  metadata = {}
}) {
  try {
    await AuditLog.create({
      actorId: actor?._id,
      actorEmail: actor?.email || '',
      actorRole: actor?.role || 'system',
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      status,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.headers?.['user-agent'] || '',
      metadata
    });
  } catch {
    // Audit logging should never crash primary request flow
  }
}
