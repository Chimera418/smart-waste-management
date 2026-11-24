import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { User } from '../shared/models/User.js';
import { WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import {
  categorizeWasteComplaint,
  estimateComplaintPriority
} from '../shared/services/geminiService.js';
import { detectPotentialDuplicates } from '../shared/services/duplicateService.js';
import { dispatchNotification } from '../shared/services/notificationService.js';
import { recordAudit } from '../shared/services/auditService.js';
import { AppError, asyncHandler, generateCode, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const checkDuplicateSchema = z.object({
  title: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().min(5).max(3000),
  wasteCategory: z.enum(WASTE_CATEGORIES).optional(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
});

const createComplaintSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(3000),
  wasteCategory: z.enum(WASTE_CATEGORIES).optional(),
  estimatedWeightKg: z.number().min(1).max(20000).optional().default(50),
  address: z.string().trim().min(3).max(300),
  landmark: z.string().trim().max(150).optional().default(''),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  aiSuggestedCategory: z.enum(WASTE_CATEGORIES).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  aiIssueType: z.string().max(120).optional(),
  aiSummary: z.string().max(300).optional(),
  aiKeywords: z.array(z.string()).max(8).optional(),
  aiModelUsed: z.string().max(80).optional(),
  aiFallbackUsed: z.boolean().optional()
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'citizen') {
      filter.citizenId = req.user._id;
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.wasteCategory) filter.wasteCategory = req.query.wasteCategory;
    if (req.query.q) {
      filter.$or = [
        { title: { $regex: req.query.q, $options: 'i' } },
        { description: { $regex: req.query.q, $options: 'i' } },
        { complaintCode: { $regex: req.query.q, $options: 'i' } },
        { address: { $regex: req.query.q, $options: 'i' } }
      ];
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('citizenId', 'name email phone')
        .populate('zoneId', 'name code')
        .populate('assignedTaskId', 'taskCode status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Complaint.countDocuments(filter)
    ]);

    return sendSuccess(res, { data: complaints, meta: { page, limit, total } });
  })
);

router.post(
  '/check-duplicates',
  authenticate,
  validateBody(checkDuplicateSchema),
  asyncHandler(async (req, res) => {
    const analysis = await detectPotentialDuplicates({
      title: req.body.title,
      description: req.body.description,
      coordinates: req.body.coordinates,
      wasteCategory: req.body.wasteCategory,
      useAiContext: true
    });
    return sendSuccess(res, { data: analysis });
  })
);

router.post(
  '/',
  authenticate,
  authorize('citizen', 'admin'),
  validateBody(createComplaintSchema),
  asyncHandler(async (req, res) => {
    const { title, description, coordinates, address, landmark, estimatedWeightKg } = req.body;

    const aiCat = req.body.aiSuggestedCategory
      ? {
          suggestedCategory: req.body.aiSuggestedCategory,
          confidence: req.body.aiConfidence ?? 0.85,
          issueType: req.body.aiIssueType || 'Citizen-Verified Waste Issue',
          summary: req.body.aiSummary || description.slice(0, 180),
          keywords: req.body.aiKeywords || [],
          modelUsed: req.body.aiModelUsed || 'gemini-3-flash-preview',
          fallbackUsed: Boolean(req.body.aiFallbackUsed)
        }
      : await categorizeWasteComplaint({ title, description });

    const finalCategory = req.body.wasteCategory || aiCat.suggestedCategory;

    const [duplicateAnalysis, priorityEstimate, matchedZone] = await Promise.all([
      detectPotentialDuplicates({
        title,
        description,
        coordinates,
        wasteCategory: finalCategory,
        useAiContext: true
      }),
      estimateComplaintPriority({
        description,
        wasteCategory: finalCategory,
        coordinates,
        submittedAt: new Date()
      }),
      CollectionZone.findOne({
        isActive: true,
        boundary: { $geoIntersects: { $geometry: { type: 'Point', coordinates } } }
      }).select('_id name code')
    ]);

    const complaint = await Complaint.create({
      complaintCode: generateCode('SWM'),
      citizenId: req.user._id,
      title,
      description,
      wasteCategory: finalCategory,
      aiCategorization: {
        ...aiCat,
        userAccepted: finalCategory === aiCat.suggestedCategory
      },
      priority: priorityEstimate.suggestedPriority,
      aiPriority: {
        suggestedPriority: priorityEstimate.suggestedPriority,
        score: priorityEstimate.score,
        reasoning: priorityEstimate.reasoning,
        ruleAdjustments: priorityEstimate.ruleAdjustments,
        overriddenByAdmin: false,
        modelUsed: priorityEstimate.modelUsed,
        fallbackUsed: priorityEstimate.fallbackUsed
      },
      estimatedWeightKg,
      location: { type: 'Point', coordinates },
      address,
      landmark,
      zoneId: matchedZone?._id,
      status: 'submitted',
      statusHistory: [
        {
          status: 'submitted',
          note: duplicateAnalysis.isPotentialDuplicate
            ? 'Submitted with potential nearby duplicate flagged for triage.'
            : 'Complaint registered and auto-prioritized.',
          changedBy: req.user._id
        }
      ],
      duplicateAnalysis,
      slaDeadline: priorityEstimate.slaDeadline
    });

    await dispatchNotification({
      recipientId: req.user._id,
      recipientRole: req.user.role,
      type: 'complaint_submitted',
      title: `Complaint ${complaint.complaintCode} Registered`,
      message: `Logged as ${finalCategory} (${complaint.priority.toUpperCase()} priority) at ${address}.`,
      relatedEntityType: 'complaint',
      relatedEntityId: complaint._id
    });

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    await Promise.all(
      admins.map((a) =>
        dispatchNotification({
          recipientId: a._id,
          recipientRole: 'admin',
          type: 'complaint_submitted',
          title: `New ${complaint.priority.toUpperCase()} Complaint (${complaint.complaintCode})`,
          message: `${title} at ${address}${matchedZone ? ` [${matchedZone.code}]` : ''}.`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint._id
        })
      )
    );

    await recordAudit({
      actor: req.user,
      action: 'COMPLAINT_SUBMITTED',
      resourceType: 'complaint',
      resourceId: complaint._id,
      req,
      metadata: {
        complaintCode: complaint.complaintCode,
        category: finalCategory,
        priority: complaint.priority,
        zoneCode: matchedZone?.code || null
      }
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Waste complaint submitted successfully',
      data: complaint
    });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizenId', 'name email phone')
      .populate('zoneId', 'name code')
      .populate('assignedTaskId');
    if (!complaint) throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    if (
      req.user.role === 'citizen' &&
      complaint.citizenId?._id?.toString() !== req.user._id.toString()
    ) {
      throw new AppError(403, 'FORBIDDEN', 'You can only view your own complaints');
    }
    return sendSuccess(res, { data: complaint });
  })
);

export default router;
