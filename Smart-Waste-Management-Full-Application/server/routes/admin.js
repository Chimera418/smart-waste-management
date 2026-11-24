import express from 'express';
import { z } from 'zod';
import { User } from '../shared/models/User.js';
import { Complaint } from '../shared/models/Complaint.js';
import { Worker } from '../shared/models/Worker.js';
import { Vehicle } from '../shared/models/Vehicle.js';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { Escalation } from '../shared/models/Escalation.js';
import { AuditLog } from '../shared/models/AuditLog.js';
import { PRIORITY_LEVELS } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { computeSlaDeadline } from '../shared/services/geminiService.js';
import { runEscalationCheck } from '../shared/services/escalationService.js';
import { dispatchNotification } from '../shared/services/notificationService.js';
import { recordAudit } from '../shared/services/auditService.js';
import { getAnalyticsSummary } from '../shared/services/analyticsService.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();
router.use(authenticate, authorize('admin'));

const priorityOverrideSchema = z.object({
  priority: z.enum(PRIORITY_LEVELS),
  overrideReason: z.string().trim().min(3).max(300)
});

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [summary, usersByRole, zonesCount, recentEscalations] = await Promise.all([
      getAnalyticsSummary(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      CollectionZone.countDocuments({ isActive: true }),
      Escalation.find().sort({ createdAt: -1 }).limit(10)
    ]);

    return sendSuccess(res, {
      data: {
        summary,
        usersByRole: Object.fromEntries(usersByRole.map((u) => [u._id, u.count])),
        zonesCount,
        recentEscalations
      }
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(150);
    return sendSuccess(res, { data: users });
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    user.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
    await user.save();

    await recordAudit({
      actor: req.user,
      action: 'USER_STATUS_UPDATED',
      resourceType: 'user',
      resourceId: user._id,
      req,
      metadata: { isActive: user.isActive }
    });
    return sendSuccess(res, { message: 'User status updated', data: user });
  })
);

router.patch(
  '/complaints/:id/priority',
  validateBody(priorityOverrideSchema),
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');

    const prev = complaint.priority;
    complaint.priority = req.body.priority;
    complaint.slaDeadline = computeSlaDeadline(req.body.priority, complaint.createdAt);
    complaint.aiPriority = {
      ...(complaint.aiPriority || {}),
      overriddenByAdmin: true,
      overrideReason: req.body.overrideReason,
      overriddenBy: req.user._id
    };
    complaint.statusHistory.push({
      status: complaint.status,
      note: `Admin overrode priority from ${prev} to ${req.body.priority}: ${req.body.overrideReason}`,
      changedBy: req.user._id
    });
    await complaint.save();

    await dispatchNotification({
      recipientId: complaint.citizenId,
      recipientRole: 'citizen',
      type: 'status_updated',
      title: `Priority Updated (${complaint.complaintCode})`,
      message: `Municipal admin updated priority to ${req.body.priority.toUpperCase()}.`,
      relatedEntityType: 'complaint',
      relatedEntityId: complaint._id
    });

    await recordAudit({
      actor: req.user,
      action: 'PRIORITY_OVERRIDDEN',
      resourceType: 'complaint',
      resourceId: complaint._id,
      req,
      metadata: { previousPriority: prev, newPriority: req.body.priority, reason: req.body.overrideReason }
    });

    return sendSuccess(res, { message: 'Priority updated', data: complaint });
  })
);

router.get(
  '/escalations',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const [escalations, overdueComplaints] = await Promise.all([
      Escalation.find().sort({ createdAt: -1 }).limit(100),
      Complaint.find({
        status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] },
        slaDeadline: { $lt: now }
      })
        .select('complaintCode title priority status slaDeadline escalationLevel address')
        .sort({ slaDeadline: 1 })
    ]);
    return sendSuccess(res, { data: { escalations, overdueComplaints } });
  })
);

router.post(
  '/escalations/run',
  asyncHandler(async (req, res) => {
    const result = await runEscalationCheck({ triggeredBy: 'admin_manual', actor: req.user });
    return sendSuccess(res, { message: 'Escalation check completed', data: result });
  })
);

router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.status) filter.status = req.query.status;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(150);
    return sendSuccess(res, { data: logs });
  })
);

router.get(
  '/reports/export',
  asyncHandler(async (req, res) => {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const [summary, complaints, workersCount, vehiclesCount] = await Promise.all([
      getAnalyticsSummary(),
      Complaint.find()
        .select('complaintCode title wasteCategory priority status address createdAt resolvedAt')
        .sort({ createdAt: -1 })
        .limit(500),
      Worker.countDocuments(),
      Vehicle.countDocuments()
    ]);

    await recordAudit({
      actor: req.user,
      action: 'REPORT_EXPORTED',
      resourceType: 'report',
      req,
      metadata: { format, rows: complaints.length }
    });

    if (format === 'csv') {
      const header = 'complaintCode,title,wasteCategory,priority,status,address,createdAt,resolvedAt\n';
      const rows = complaints
        .map((c) =>
          [
            c.complaintCode,
            `"${String(c.title).replace(/"/g, '""')}"`,
            c.wasteCategory,
            c.priority,
            c.status,
            `"${String(c.address).replace(/"/g, '""')}"`,
            c.createdAt?.toISOString() || '',
            c.resolvedAt?.toISOString() || ''
          ].join(',')
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="civicclean-full-report.csv"');
      return res.status(200).send(header + rows);
    }

    return sendSuccess(res, {
      data: { generatedAt: new Date().toISOString(), summary, workersCount, vehiclesCount, complaints }
    });
  })
);

export default router;
