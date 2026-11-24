import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { detectPotentialDuplicates } from '../shared/services/duplicateService.js';
import { createComplaintRecord } from '../shared/services/complaintService.js';
import { haversineKm } from '../shared/services/vehicleRecommendationService.js';
import { maybeAutoSimulateStep } from '../shared/services/vehicleSimulationService.js';
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

const TASK_POPULATE = {
  path: 'assignedTaskId',
  select: 'taskCode status priority milestonesNotified scheduledFor completedAt assignedWorkerId assignedVehicleId',
  populate: [
    {
      path: 'assignedWorkerId',
      select: 'employeeCode availability shift phone userId',
      populate: { path: 'userId', select: 'name email phone' }
    },
    {
      path: 'assignedVehicleId',
      select: 'registrationNumber name type status currentLocation operatorId',
      populate: { path: 'operatorId', select: 'name phone' }
    }
  ]
};

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
        .populate(TASK_POPULATE)
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
    const complaint = await createComplaintRecord({
      user: req.user,
      payload: req.body,
      req,
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
  '/:id/tracking',
  authenticate,
  asyncHandler(async (req, res) => {
    await maybeAutoSimulateStep(1000);

    const complaint = await Complaint.findById(req.params.id).select(
      'complaintCode title address status priority wasteCategory location citizenId assignedTaskId'
    );
    if (!complaint) throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    if (
      req.user.role === 'citizen' &&
      complaint.citizenId?.toString() !== req.user._id.toString()
    ) {
      throw new AppError(403, 'FORBIDDEN', 'You can only track your own complaints');
    }

    let task = null;
    let vehicle = null;
    let distanceKm = null;
    let etaMinutes = null;
    let speedKmh = 0;
    let heading = 0;
    let milestonesNotified = [];

    if (complaint.assignedTaskId) {
      task = await CollectionTask.findById(complaint.assignedTaskId)
        .populate('assignedVehicleId', 'registrationNumber name type status currentLocation locationHistory locationUpdatedAt')
        .populate({
          path: 'assignedWorkerId',
          populate: { path: 'userId', select: 'name phone' }
        });
      vehicle = task?.assignedVehicleId || null;
      milestonesNotified = task?.milestonesNotified || [];
      const latestPoint = vehicle?.locationHistory?.[vehicle.locationHistory.length - 1];
      speedKmh = latestPoint?.speedKmh ?? 0;
      heading = latestPoint?.heading ?? 0;
      if (vehicle?.currentLocation?.coordinates && complaint.location?.coordinates) {
        distanceKm = haversineKm(vehicle.currentLocation.coordinates, complaint.location.coordinates);
        etaMinutes = distanceKm <= 0.08 ? 0 : Math.max(1, Math.ceil((distanceKm / 30) * 60));
      }
    }

    return sendSuccess(res, {
      data: { complaint, task, vehicle, distanceKm, etaMinutes, speedKmh, heading, milestonesNotified }
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
      .populate(TASK_POPULATE);
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
