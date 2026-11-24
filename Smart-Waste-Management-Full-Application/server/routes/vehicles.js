import express from 'express';
import { z } from 'zod';
import { Vehicle } from '../shared/models/Vehicle.js';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { Complaint } from '../shared/models/Complaint.js';
import { VEHICLE_STATUSES, VEHICLE_TYPES, WASTE_CATEGORIES } from '../shared/config/constants.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { recommendVehicles, haversineKm } from '../shared/services/vehicleRecommendationService.js';
import {
  getSimulationState,
  maybeAutoSimulateStep,
  setSimulationPaused,
  simulateFleetStep
} from '../shared/services/vehicleSimulationService.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const createVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(4).max(30),
  name: z.string().trim().min(2).max(100),
  type: z.enum(VEHICLE_TYPES),
  supportedWasteCategories: z.array(z.enum(WASTE_CATEGORIES)).optional().default(['mixed']),
  capacityKg: z.number().min(50).max(50000),
  operatorId: z.string().optional(),
  assignedZoneId: z.string().optional(),
  coordinates: z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .optional()
    .default([77.5946, 12.9716])
});

const updateVehicleSchema = z.object({
  name: z.string().trim().min(2).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
  operatorId: z.string().nullable().optional(),
  assignedZoneId: z.string().nullable().optional(),
  currentLoadKg: z.number().min(0).optional(),
  supportedWasteCategories: z.array(z.enum(WASTE_CATEGORIES)).optional()
});

const locationSchema = z.object({
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  speedKmh: z.number().min(0).max(160).optional().default(24),
  heading: z.number().min(0).max(360).optional().default(0)
});

const recommendSchema = z.object({
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  wasteCategory: z.enum(WASTE_CATEGORIES).optional().default('mixed'),
  estimatedWeightKg: z.number().min(1).max(20000).optional().default(50),
  zoneId: z.string().optional(),
  includeAiExplanation: z.boolean().optional().default(false)
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.mine === 'true' && req.user.role === 'vehicle_operator') {
      filter.operatorId = req.user._id;
    }
    const vehicles = await Vehicle.find(filter)
      .populate('operatorId', 'name email phone')
      .populate('assignedZoneId', 'name code')
      .sort({ createdAt: -1 });
    return sendSuccess(res, { data: vehicles });
  })
);

router.get(
  '/tracking',
  authenticate,
  authorize('admin', 'worker', 'vehicle_operator'),
  asyncHandler(async (_req, res) => {
    await maybeAutoSimulateStep(1000);

    const [vehicles, activeComplaints, zones, activeTasks] = await Promise.all([
      Vehicle.find({ status: { $ne: 'inactive' } })
        .populate('operatorId', 'name phone')
        .populate('assignedZoneId', 'name code'),
      Complaint.find({ status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] } })
        .select('complaintCode title wasteCategory priority status location address')
        .limit(150),
      CollectionZone.find({ isActive: true }).select('name code wardNumber boundary center'),
      CollectionTask.find({ status: { $in: ['assigned', 'accepted', 'en_route', 'in_progress'] } })
        .select('taskCode status assignedVehicleId complaintId milestonesNotified')
        .populate('complaintId', 'complaintCode title location address')
        .lean()
    ]);

    const vehicleMap = new Map(vehicles.map((v) => [v._id.toString(), v]));
    const enrichedTasks = activeTasks.map((t) => {
      const v = vehicleMap.get(t.assignedVehicleId?.toString());
      const vCoords = v?.currentLocation?.coordinates;
      const cCoords = t.complaintId?.location?.coordinates;
      const distanceKm = vCoords && cCoords ? haversineKm(vCoords, cCoords) : null;
      const etaMinutes =
        distanceKm === null ? null : distanceKm <= 0.08 ? 0 : Math.max(1, Math.ceil((distanceKm / 30) * 60));
      return { ...t, distanceKm, etaMinutes };
    });

    return sendSuccess(res, {
      data: {
        vehicles,
        activeComplaints,
        zones,
        activeTasks: enrichedTasks,
        simulation: getSimulationState()
      }
    });
  })
);

router.post(
  '/simulation-toggle',
  authenticate,
  authorize('admin', 'vehicle_operator'),
  asyncHandler(async (req, res) => {
    const paused = typeof req.body?.paused === 'boolean' ? req.body.paused : !getSimulationState().paused;
    const state = setSimulationPaused(paused);
    return sendSuccess(res, {
      message: state.running ? 'Live fleet simulation resumed' : 'Live fleet simulation paused',
      data: state
    });
  })
);

router.post(
  '/simulate-step',
  authenticate,
  authorize('admin', 'vehicle_operator'),
  asyncHandler(async (req, res) => {
    const vehicleId = req.body?.vehicleId || null;
    const result = await simulateFleetStep({ vehicleId, actor: req.user });
    return sendSuccess(res, { message: 'Fleet movement simulated', data: result });
  })
);

router.post(
  '/recommend',
  authenticate,
  authorize('admin'),
  validateBody(recommendSchema),
  asyncHandler(async (req, res) => {
    const result = await recommendVehicles(req.body);
    return sendSuccess(res, { data: result });
  })
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(createVehicleSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.create({
      registrationNumber: req.body.registrationNumber,
      name: req.body.name,
      type: req.body.type,
      supportedWasteCategories: req.body.supportedWasteCategories,
      capacityKg: req.body.capacityKg,
      operatorId: req.body.operatorId || undefined,
      assignedZoneId: req.body.assignedZoneId || undefined,
      currentLocation: { type: 'Point', coordinates: req.body.coordinates },
      locationHistory: [{ coordinates: req.body.coordinates, speedKmh: 0, heading: 0 }]
    });
    const populated = await Vehicle.findById(vehicle._id)
      .populate('operatorId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    return sendSuccess(res, { statusCode: 201, message: 'Vehicle registered', data: populated });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('operatorId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    if (!vehicle) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found');
    return sendSuccess(res, { data: vehicle });
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateVehicleSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('operatorId', 'name email phone')
      .populate('assignedZoneId', 'name code');
    if (!vehicle) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found');
    return sendSuccess(res, { message: 'Vehicle updated', data: vehicle });
  })
);

router.patch(
  '/:id/location',
  authenticate,
  authorize('vehicle_operator', 'admin'),
  validateBody(locationSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found');
    if (
      req.user.role === 'vehicle_operator' &&
      vehicle.operatorId?.toString() !== req.user._id.toString()
    ) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update GPS for your assigned vehicle');
    }

    vehicle.currentLocation = { type: 'Point', coordinates: req.body.coordinates };
    vehicle.locationUpdatedAt = new Date();
    vehicle.locationHistory.push({
      coordinates: req.body.coordinates,
      speedKmh: req.body.speedKmh,
      heading: req.body.heading,
      recordedAt: new Date()
    });
    if (vehicle.locationHistory.length > 50) {
      vehicle.locationHistory = vehicle.locationHistory.slice(-50);
    }
    if (vehicle.status === 'assigned') vehicle.status = 'in_transit';
    await vehicle.save();

    return sendSuccess(res, { message: 'Vehicle GPS coordinates updated', data: vehicle });
  })
);

export default router;
