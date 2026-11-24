import express from 'express';
import { z } from 'zod';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { Complaint } from '../shared/models/Complaint.js';
import { Worker } from '../shared/models/Worker.js';
import { Vehicle } from '../shared/models/Vehicle.js';
import { Escalation } from '../shared/models/Escalation.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { dispatchNotification } from '../shared/services/notificationService.js';
import { recordAudit } from '../shared/services/auditService.js';
import { AppError, asyncHandler, generateCode, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const createTaskSchema = z.object({
  complaintId: z.string(),
  assignedWorkerId: z.string(),
  assignedVehicleId: z.string(),
  instructions: z.string().max(500).optional().default(''),
  scheduledFor: z.string().optional(),
  recommendationSnapshot: z
    .object({
      score: z.number().optional(),
      distanceKm: z.number().optional(),
      reason: z.string().optional()
    })
    .optional()
});

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(300)
});

const statusUpdateSchema = z.object({
  status: z.enum(['en_route', 'in_progress', 'completed', 'cancelled']),
  note: z.string().max(400).optional().default(''),
  collectedWeightKg: z.number().min(0).max(50000).optional()
});

router.get(
  '/',
  authenticate,
  authorize('admin', 'worker', 'vehicle_operator'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (req.user.role === 'worker') {
      const worker = await Worker.findOne({ userId: req.user._id });
      if (!worker) return sendSuccess(res, { data: [] });
      filter.assignedWorkerId = worker._id;
    } else if (req.user.role === 'vehicle_operator') {
      const vehicles = await Vehicle.find({ operatorId: req.user._id }).select('_id');
      filter.assignedVehicleId = { $in: vehicles.map((v) => v._id) };
    }

    const tasks = await CollectionTask.find(filter)
      .populate('complaintId', 'complaintCode title wasteCategory priority status address location')
      .populate({
        path: 'assignedWorkerId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate('assignedVehicleId', 'registrationNumber name type status capacityKg currentLocation')
      .populate('zoneId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return sendSuccess(res, { data: tasks });
  })
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const [complaint, worker, vehicle] = await Promise.all([
      Complaint.findById(req.body.complaintId),
      Worker.findById(req.body.assignedWorkerId),
      Vehicle.findById(req.body.assignedVehicleId)
    ]);
    if (!complaint) throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker not found');
    if (!vehicle) throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found');

    const task = await CollectionTask.create({
      taskCode: generateCode('TSK'),
      complaintId: complaint._id,
      zoneId: complaint.zoneId || worker.assignedZoneId,
      assignedWorkerId: worker._id,
      assignedVehicleId: vehicle._id,
      assignedBy: req.user._id,
      priority: complaint.priority,
      instructions: req.body.instructions,
      recommendationSnapshot: req.body.recommendationSnapshot,
      scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : new Date(),
      statusHistory: [
        { status: 'assigned', note: 'Task dispatched by administrator', updatedBy: req.user._id }
      ]
    });

    complaint.status = 'assigned';
    complaint.assignedTaskId = task._id;
    complaint.statusHistory.push({
      status: 'assigned',
      note: `Assigned task ${task.taskCode} with vehicle ${vehicle.registrationNumber}`,
      changedBy: req.user._id
    });
    await complaint.save();

    worker.activeTaskCount += 1;
    worker.availability = 'on_duty';
    await worker.save();

    if (vehicle.status === 'available') {
      vehicle.status = 'assigned';
      await vehicle.save();
    }

    await Promise.all([
      dispatchNotification({
        recipientId: worker.userId,
        recipientRole: 'worker',
        type: 'task_assigned',
        title: `New Task ${task.taskCode}`,
        message: `Assigned complaint ${complaint.complaintCode} at ${complaint.address}.`,
        relatedEntityType: 'task',
        relatedEntityId: task._id,
        sendEmail: true
      }),
      dispatchNotification({
        recipientId: complaint.citizenId,
        recipientRole: 'citizen',
        type: 'status_updated',
        title: `Crew Assigned (${complaint.complaintCode})`,
        message: `Vehicle ${vehicle.registrationNumber} (${vehicle.name}) has been assigned to collect your reported waste at ${complaint.address}. Track it live in My Complaints.`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaint._id,
        sendEmail: true
      }),
      vehicle.operatorId
        ? dispatchNotification({
            recipientId: vehicle.operatorId,
            recipientRole: 'vehicle_operator',
            type: 'task_assigned',
            title: `Route Dispatched (${task.taskCode})`,
            message: `Vehicle ${vehicle.registrationNumber} assigned to ${complaint.address}.`,
            relatedEntityType: 'task',
            relatedEntityId: task._id,
            sendEmail: true
          })
        : Promise.resolve()
    ]);

    await recordAudit({
      actor: req.user,
      action: 'TASK_ASSIGNED',
      resourceType: 'task',
      resourceId: task._id,
      req,
      metadata: {
        taskCode: task.taskCode,
        complaintCode: complaint.complaintCode,
        vehicleReg: vehicle.registrationNumber
      }
    });

    const populated = await CollectionTask.findById(task._id)
      .populate('complaintId')
      .populate({ path: 'assignedWorkerId', populate: { path: 'userId', select: 'name email' } })
      .populate('assignedVehicleId');

    return sendSuccess(res, { statusCode: 201, message: 'Collection task created', data: populated });
  })
);

router.patch(
  '/:id/accept',
  authenticate,
  authorize('worker', 'admin'),
  asyncHandler(async (req, res) => {
    const task = await CollectionTask.findById(req.params.id);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    task.status = 'accepted';
    task.acceptedAt = new Date();
    task.statusHistory.push({
      status: 'accepted',
      note: 'Worker accepted task assignment',
      updatedBy: req.user._id
    });
    await task.save();
    return sendSuccess(res, { message: 'Task accepted', data: task });
  })
);

router.patch(
  '/:id/reject',
  authenticate,
  authorize('worker', 'admin'),
  validateBody(rejectSchema),
  asyncHandler(async (req, res) => {
    const task = await CollectionTask.findById(req.params.id);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    task.status = 'rejected';
    task.rejectionReason = req.body.reason;
    task.statusHistory.push({
      status: 'rejected',
      note: `Rejected: ${req.body.reason}`,
      updatedBy: req.user._id
    });
    await task.save();

    await Worker.findByIdAndUpdate(task.assignedWorkerId, {
      $inc: { activeTaskCount: -1 },
      availability: 'available'
    });
    await Vehicle.findByIdAndUpdate(task.assignedVehicleId, { status: 'available' });
    await Complaint.findByIdAndUpdate(task.complaintId, {
      status: 'under_review',
      $push: {
        statusHistory: {
          status: 'under_review',
          note: `Task ${task.taskCode} rejected by worker (${req.body.reason}); awaiting reassignment.`,
          changedBy: req.user._id
        }
      }
    });

    return sendSuccess(res, { message: 'Task rejected', data: task });
  })
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('worker', 'vehicle_operator', 'admin'),
  validateBody(statusUpdateSchema),
  asyncHandler(async (req, res) => {
    const task = await CollectionTask.findById(req.params.id);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');

    task.status = req.body.status;
    if (req.body.status === 'en_route') {
      if (!task.startedAt) task.startedAt = new Date();
      const complaint = await Complaint.findById(task.complaintId);
      if (complaint) {
        await dispatchNotification({
          recipientId: complaint.citizenId,
          recipientRole: 'citizen',
          type: 'task_updated',
          title: `Collection Crew En Route (${complaint.complaintCode})`,
          message: `Task ${task.taskCode} is now en route to ${complaint.address}. Track the vehicle live in My Complaints.`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint._id,
          sendEmail: true
        });
      }
    }
    if (req.body.status === 'in_progress') {
      if (!task.startedAt) task.startedAt = new Date();
      const complaint = await Complaint.findByIdAndUpdate(
        task.complaintId,
        {
          status: 'in_progress',
          $push: {
            statusHistory: {
              status: 'in_progress',
              note: req.body.note || 'Collection crew is on-site.',
              changedBy: req.user._id
            }
          }
        },
        { new: true }
      );
      await Vehicle.findByIdAndUpdate(task.assignedVehicleId, { status: 'in_transit' });
      if (complaint) {
        await dispatchNotification({
          recipientId: complaint.citizenId,
          recipientRole: 'citizen',
          type: 'task_updated',
          title: `Crew Working On-Site (${complaint.complaintCode})`,
          message: req.body.note || `Collection crew is actively clearing waste at ${complaint.address}.`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint._id,
          sendEmail: true
        });
      }
    }

    if (req.body.status === 'completed') {
      task.completedAt = new Date();
      task.collectedWeightKg = req.body.collectedWeightKg ?? task.collectedWeightKg ?? 50;
      task.completionNotes = req.body.note || 'Waste cleared and area sanitized.';

      const complaint = await Complaint.findByIdAndUpdate(
        task.complaintId,
        {
          status: 'resolved',
          resolvedAt: new Date(),
          $push: {
            statusHistory: {
              status: 'resolved',
              note: task.completionNotes,
              changedBy: req.user._id
            }
          }
        },
        { new: true }
      );

      await Escalation.updateMany({ complaintId: task.complaintId, resolved: false }, { resolved: true });
      await Worker.findByIdAndUpdate(task.assignedWorkerId, {
        $inc: { activeTaskCount: -1, completedTasksCount: 1 },
        availability: 'available'
      });
      await Vehicle.findByIdAndUpdate(task.assignedVehicleId, {
        status: 'available',
        $inc: { totalTripsCompleted: 1, totalWasteCollectedKg: task.collectedWeightKg }
      });

      if (complaint) {
        await dispatchNotification({
          recipientId: complaint.citizenId,
          recipientRole: 'citizen',
          type: 'task_completed',
          title: `Complaint ${complaint.complaintCode} Resolved`,
          message: `Waste collection (${task.collectedWeightKg}kg) completed at ${complaint.address}.`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint._id,
          sendEmail: true
        });
      }

      await recordAudit({
        actor: req.user,
        action: 'TASK_COMPLETED',
        resourceType: 'task',
        resourceId: task._id,
        req,
        metadata: { taskCode: task.taskCode, collectedWeightKg: task.collectedWeightKg }
      });
    }

    task.statusHistory.push({
      status: req.body.status,
      note: req.body.note || `Updated to ${req.body.status}`,
      updatedBy: req.user._id
    });
    await task.save();

    return sendSuccess(res, { message: 'Task status updated', data: task });
  })
);

export default router;
