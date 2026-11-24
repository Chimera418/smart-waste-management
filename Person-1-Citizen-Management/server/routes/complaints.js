import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { Notification } from '../shared/models/Notification.js';
import { WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { categorizeWasteComplaint } from '../shared/services/geminiService.js';
import { detectPotentialDuplicates } from '../shared/services/duplicateService.js';
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
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('citizenId', 'name email phone')
        .populate('zoneId', 'name code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Complaint.countDocuments(filter)
    ]);

    return sendSuccess(res, {
      data: complaints,
      meta: { page, limit, total }
    });
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

    // Run Gemini categorization if user didn't already run preview categorization
    let aiCat = null;
    if (req.body.aiSuggestedCategory) {
      aiCat = {
        suggestedCategory: req.body.aiSuggestedCategory,
        confidence: req.body.aiConfidence ?? 0.8,
        issueType: req.body.aiIssueType || 'Citizen-Verified Waste Issue',
        summary: req.body.aiSummary || description.slice(0, 180),
        keywords: req.body.aiKeywords || [],
        modelUsed: req.body.aiModelUsed || 'gemini-3-flash-preview',
        fallbackUsed: Boolean(req.body.aiFallbackUsed)
      };
    } else {
      aiCat = await categorizeWasteComplaint({ title, description });
    }

    const finalCategory = req.body.wasteCategory || aiCat.suggestedCategory;
    const duplicateAnalysis = await detectPotentialDuplicates({
      title,
      description,
      coordinates,
      wasteCategory: finalCategory,
      useAiContext: true
    });

    const matchedZone = await CollectionZone.findOne({
      isActive: true,
      boundary: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates }
        }
      }
    }).select('_id name code');

    const defaultHours = finalCategory === 'hazardous' || finalCategory === 'medical' ? 12 : 48;
    const slaDeadline = new Date(Date.now() + defaultHours * 3600 * 1000);

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
      priority: finalCategory === 'hazardous' || finalCategory === 'medical' ? 'high' : 'medium',
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
            ? 'Complaint registered with potential nearby duplicate flagged for review.'
            : 'Complaint submitted by citizen.',
          changedBy: req.user._id
        }
      ],
      duplicateAnalysis,
      slaDeadline
    });

    await Notification.create({
      recipientId: req.user._id,
      recipientRole: req.user.role,
      type: 'complaint_submitted',
      title: `Complaint ${complaint.complaintCode} Registered`,
      message: `Your ${finalCategory} waste complaint at ${address} has been logged and queued for triage.`,
      relatedEntityType: 'complaint',
      relatedEntityId: complaint._id
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
      .populate('zoneId', 'name code');
    if (!complaint) {
      throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    }
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
