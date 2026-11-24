import express from 'express';
import { z } from 'zod';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { Complaint } from '../shared/models/Complaint.js';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { Worker } from '../shared/models/Worker.js';
import { Vehicle } from '../shared/models/Vehicle.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const createZoneSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(20),
  description: z.string().optional().default(''),
  wardNumber: z.string().optional().default(''),
  boundaryCoordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
  centerCoordinates: z.tuple([z.number(), z.number()]),
  populationEstimate: z.number().min(0).optional().default(0)
});

const updateZoneSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  assignedWorkers: z.array(z.string()).optional(),
  assignedVehicles: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const zones = await CollectionZone.find({ isActive: true })
      .populate({
        path: 'assignedWorkers',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('assignedVehicles', 'registrationNumber name type status')
      .sort({ name: 1 });
    return sendSuccess(res, { data: zones });
  })
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(createZoneSchema),
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.create({
      name: req.body.name,
      code: req.body.code.toUpperCase(),
      description: req.body.description,
      wardNumber: req.body.wardNumber,
      boundary: { type: 'Polygon', coordinates: req.body.boundaryCoordinates },
      center: { type: 'Point', coordinates: req.body.centerCoordinates },
      populationEstimate: req.body.populationEstimate
    });
    return sendSuccess(res, { statusCode: 201, message: 'Collection zone created', data: zone });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.findById(req.params.id)
      .populate({ path: 'assignedWorkers', populate: { path: 'userId', select: 'name' } })
      .populate('assignedVehicles', 'registrationNumber name status');
    if (!zone) throw new AppError(404, 'ZONE_NOT_FOUND', 'Zone not found');
    return sendSuccess(res, { data: zone });
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateZoneSchema),
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!zone) throw new AppError(404, 'ZONE_NOT_FOUND', 'Zone not found');
    if (req.body.assignedWorkers) {
      await Worker.updateMany(
        { _id: { $in: req.body.assignedWorkers } },
        { assignedZoneId: zone._id }
      );
    }
    if (req.body.assignedVehicles) {
      await Vehicle.updateMany(
        { _id: { $in: req.body.assignedVehicles } },
        { assignedZoneId: zone._id }
      );
    }
    return sendSuccess(res, { message: 'Zone updated', data: zone });
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!zone) throw new AppError(404, 'ZONE_NOT_FOUND', 'Zone not found');
    return sendSuccess(res, { message: 'Zone deactivated', data: zone });
  })
);

router.get(
  '/:id/complaints',
  authenticate,
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.findById(req.params.id);
    if (!zone) throw new AppError(404, 'ZONE_NOT_FOUND', 'Zone not found');
    const complaints = await Complaint.find({
      location: { $geoWithin: { $geometry: zone.boundary } }
    }).sort({ createdAt: -1 });
    return sendSuccess(res, { data: complaints });
  })
);

router.get(
  '/:id/progress',
  authenticate,
  asyncHandler(async (req, res) => {
    const zone = await CollectionZone.findById(req.params.id);
    if (!zone) throw new AppError(404, 'ZONE_NOT_FOUND', 'Zone not found');

    const [totalComplaints, resolvedComplaints, tasks] = await Promise.all([
      Complaint.countDocuments({ location: { $geoWithin: { $geometry: zone.boundary } } }),
      Complaint.countDocuments({
        location: { $geoWithin: { $geometry: zone.boundary } },
        status: 'resolved'
      }),
      CollectionTask.find({ zoneId: zone._id }).select('status collectedWeightKg')
    ]);

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const totalCollectedKg = tasks.reduce((sum, t) => sum + (t.collectedWeightKg || 0), 0);

    return sendSuccess(res, {
      data: {
        zoneId: zone._id,
        zoneName: zone.name,
        totalComplaints,
        resolvedComplaints,
        totalTasks: tasks.length,
        completedTasks,
        totalCollectedKg
      }
    });
  })
);

export default router;
