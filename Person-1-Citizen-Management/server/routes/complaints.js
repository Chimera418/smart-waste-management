import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { detectPotentialDuplicates } from '../shared/services/duplicateService.js';
import { createComplaintRecord } from '../shared/services/complaintService.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

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
    const complaint = await createComplaintRecord({
      user: req.user,
      payload: req.body,
      source: 'portal'
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
