import { Complaint } from '../models/Complaint.js';
import { Escalation } from '../models/Escalation.js';
import { User } from '../models/User.js';
import { PRIORITY_LEVELS } from '../config/constants.js';
import { dispatchNotification } from './notificationService.js';
import { recordAudit } from './auditService.js';

const COOLDOWN_MS = 6 * 3600 * 1000;

function nextPriority(current) {
  const idx = PRIORITY_LEVELS.indexOf(current);
  if (idx === -1) return 'high';
  return PRIORITY_LEVELS[Math.min(3, idx + 1)];
}

export async function runEscalationCheck({ triggeredBy = 'system_cron', actor = null } = {}) {
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS);

  const overdueComplaints = await Complaint.find({
    status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] },
    slaDeadline: { $lt: now },
    escalationLevel: { $lt: 3 },
    $or: [{ lastEscalatedAt: { $exists: false } }, { lastEscalatedAt: null }, { lastEscalatedAt: { $lt: cooldownCutoff } }]
  }).limit(100);

  if (overdueComplaints.length === 0) {
    return { scanned: 0, escalatedCount: 0, escalations: [] };
  }

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  const adminIds = admins.map((a) => a._id);
  const createdEscalations = [];

  for (const complaint of overdueComplaints) {
    const previousPriority = complaint.priority;
    const newPriority = nextPriority(previousPriority);
    const nextLevel = (complaint.escalationLevel || 0) + 1;
    const overdueMinutes = Math.max(
      1,
      Math.round((now.getTime() - new Date(complaint.slaDeadline).getTime()) / 60000)
    );

    complaint.priority = newPriority;
    complaint.escalationLevel = nextLevel;
    complaint.lastEscalatedAt = now;
    complaint.statusHistory.push({
      status: complaint.status,
      note: `Auto-escalated to Level ${nextLevel} (${overdueMinutes}m past SLA deadline).`,
      changedBy: actor?._id
    });
    await complaint.save();

    const esc = await Escalation.create({
      complaintId: complaint._id,
      complaintCode: complaint.complaintCode,
      previousPriority,
      newPriority,
      escalationLevel: nextLevel,
      reason: `SLA deadline exceeded by ${overdueMinutes} minute(s)`,
      overdueMinutes,
      triggeredBy,
      notifiedAdmins: adminIds
    });
    createdEscalations.push(esc);

    for (const adminId of adminIds) {
      await dispatchNotification({
        recipientId: adminId,
        recipientRole: 'admin',
        type: 'escalation_alert',
        title: `Escalation L${nextLevel}: ${complaint.complaintCode}`,
        message: `Complaint at ${complaint.address} is overdue by ${overdueMinutes}m. Priority: ${newPriority.toUpperCase()}.`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaint._id,
        sendEmail: true
      });
    }
  }

  await recordAudit({
    actor,
    action: 'ESCALATION_SCAN_EXECUTED',
    resourceType: 'escalation',
    status: 'success',
    metadata: { triggeredBy, escalatedCount: createdEscalations.length }
  });

  return {
    scanned: overdueComplaints.length,
    escalatedCount: createdEscalations.length,
    escalations: createdEscalations
  };
}
