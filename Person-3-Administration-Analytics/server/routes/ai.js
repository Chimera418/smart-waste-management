import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { estimateComplaintPriority } from '../shared/services/geminiPriorityService.js';
import { recordAudit } from '../shared/services/auditService.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const priorityRequestSchema = z.object({
  complaintId: z.string().optional(),
  description: z.string().trim().min(5),
  wasteCategory: z.enum(WASTE_CATEGORIES),
  coordinates: z.tuple([z.number(), z.number()]).optional().default([77.5946, 12.9716]),
  submittedAt: z.string().optional()
});

router.post(
  '/priority',
  authenticate,
  authorize('admin'),
  validateBody(priorityRequestSchema),
  asyncHandler(async (req, res) => {
    const estimation = await estimateComplaintPriority(req.body);

    if (req.body.complaintId) {
      const complaint = await Complaint.findById(req.body.complaintId);
      if (complaint && !complaint.aiPriority?.overriddenByAdmin) {
        complaint.priority = estimation.suggestedPriority;
        complaint.slaDeadline = estimation.slaDeadline;
        complaint.aiPriority = {
          suggestedPriority: estimation.suggestedPriority,
          score: estimation.score,
          reasoning: estimation.reasoning,
          ruleAdjustments: estimation.ruleAdjustments,
          overriddenByAdmin: false,
          modelUsed: estimation.modelUsed,
          fallbackUsed: estimation.fallbackUsed
        };
        await complaint.save();
      }
    }

    await recordAudit({
      actor: req.user,
      action: 'AI_PRIORITY_ESTIMATED',
      resourceType: 'complaint',
      resourceId: req.body.complaintId || 'preview',
      req,
      metadata: {
        suggestedPriority: estimation.suggestedPriority,
        score: estimation.score,
        fallbackUsed: estimation.fallbackUsed
      }
    });

    return sendSuccess(res, { data: estimation });
  })
);

export default router;
