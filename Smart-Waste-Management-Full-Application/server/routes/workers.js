import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../shared/models/User.js';
import { Worker } from '../shared/models/Worker.js';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { WORKER_AVAILABILITY, WORKER_SHIFTS } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { AppError, asyncHandler, generateCode, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const createWorkerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).optional().default('Worker@123'),
  phone: z.string().optional().default(''),
  shift: z.enum(WORKER_SHIFTS).optional().default('morning'),
  assignedZoneId: z.string().optional(),
  skills: z.array(z.string()).optional().default(['general_collection'])
});

const availabilitySchema = z.object({
  availability: z.enum(WORKER_AVAILABILITY)
});

const updateWorkerSchema = z.object({
  assignedZoneId: z.string().nullable().optional(),
  shift: z.enum(WORKER_SHIFTS).optional(),
  availability: z.enum(WORKER_AVAILABILITY).optional(),
  skills: z.array(z.string()).optional(),
  phone: z.string().optional()
});

router.get(
  '/',
  authenticate,
  authorize('admin', 'worker', 'vehicle_operator'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.availability) filter.availability = req.query.availability;
    if (req.query.zoneId) filter.assignedZoneId = req.query.zoneId;
    const workers = await Worker.find(filter)
      .populate('userId', 'name email phone isActive')
      .populate('assignedZoneId', 'name code')
      .sort({ createdAt: -1 });
    return sendSuccess(res, { data: workers });
  })
);

router.get(
  '/me',
  authenticate,
  authorize('worker'),
  asyncHandler(async (req, res) => {
    const worker = await Worker.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker profile not found');
    return sendSuccess(res, { data: worker });
  })
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(createWorkerSchema),
  asyncHandler(async (req, res) => {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      const passwordHash = await bcrypt.hash(req.body.password, 10);
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: 'worker',
        phone: req.body.phone
      });
    }
    const existingWorker = await Worker.findOne({ userId: user._id });
    if (existingWorker) throw new AppError(409, 'WORKER_EXISTS', 'Worker profile already exists');

    const worker = await Worker.create({
      userId: user._id,
      employeeCode: generateCode('WRK'),
      shift: req.body.shift,
      assignedZoneId: req.body.assignedZoneId || undefined,
      skills: req.body.skills,
      phone: req.body.phone
    });
    const populated = await Worker.findById(worker._id)
      .populate('userId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    return sendSuccess(res, { statusCode: 201, message: 'Worker created', data: populated });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker not found');
    return sendSuccess(res, { data: worker });
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateWorkerSchema),
  asyncHandler(async (req, res) => {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('userId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker not found');
    return sendSuccess(res, { message: 'Worker updated', data: worker });
  })
);

router.patch(
  '/:id/availability',
  authenticate,
  authorize('worker', 'admin'),
  validateBody(availabilitySchema),
  asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.params.id);
    if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker not found');
    if (req.user.role === 'worker' && worker.userId.toString() !== req.user._id.toString()) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own availability');
    }
    worker.availability = req.body.availability;
    await worker.save();
    return sendSuccess(res, { message: 'Availability updated', data: worker });
  })
);

router.get(
  '/:id/history',
  authenticate,
  authorize('worker', 'admin'),
  asyncHandler(async (req, res) => {
    const tasks = await CollectionTask.find({ assignedWorkerId: req.params.id })
      .populate('complaintId', 'complaintCode title address wasteCategory')
      .populate('assignedVehicleId', 'registrationNumber name type')
      .sort({ createdAt: -1 })
      .limit(50);
    return sendSuccess(res, { data: tasks });
  })
);

export default router;
