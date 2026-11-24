import { Vehicle } from '../models/Vehicle.js';
import { CollectionTask } from '../models/CollectionTask.js';
import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { haversineKm } from './vehicleRecommendationService.js';
import { dispatchNotification } from './notificationService.js';

let simulationPaused = false;
let lastStepAt = 0;
let stepInFlight = false;

export function getSimulationState() {
  return {
    running: !simulationPaused,
    paused: simulationPaused,
    lastStepAt: lastStepAt ? new Date(lastStepAt).toISOString() : null
  };
}

export function setSimulationPaused(paused) {
  simulationPaused = Boolean(paused);
  return getSimulationState();
}

function computeHeadingDegrees([lng1, lat1], [lng2, lat2]) {
  const y = Math.sin(((lng2 - lng1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lng2 - lng1) * Math.PI) / 180);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

function stepCoordinates([curLng, curLat], [dstLng, dstLat]) {
  const dLng = dstLng - curLng;
  const dLat = dstLat - curLat;
  const distKm = haversineKm([curLng, curLat], [dstLng, dstLat]);

  if (distKm <= 0.08) {
    return { nextCoords: [dstLng, dstLat], arrived: true, remainingKm: 0 };
  }

  const mag = Math.hypot(dLng, dLat);
  const desiredDeg = Math.min(0.0065, Math.max(0.0018, mag * 0.26));
  const ratio = mag > 0 ? Math.min(1, desiredDeg / mag) : 1;
  const nextLng = Number((curLng + dLng * ratio).toFixed(6));
  const nextLat = Number((curLat + dLat * ratio).toFixed(6));
  const remainingKm = haversineKm([nextLng, nextLat], [dstLng, dstLat]);

  return {
    nextCoords: [nextLng, nextLat],
    arrived: remainingKm <= 0.08,
    remainingKm
  };
}

export async function simulateFleetStep({ vehicleId = null, actor = null } = {}) {
  const activeTaskFilter = {
    status: { $in: ['assigned', 'accepted', 'en_route', 'in_progress'] }
  };
  if (vehicleId) {
    activeTaskFilter.assignedVehicleId = vehicleId;
  }

  const activeTasks = await CollectionTask.find(activeTaskFilter)
    .populate('complaintId', 'complaintCode title address location citizenId status statusHistory')
    .populate('assignedWorkerId', 'userId');

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  const taskedVehicleIds = new Set();
  const updates = [];
  const milestoneEvents = [];

  for (const task of activeTasks) {
    const vehicle = await Vehicle.findById(task.assignedVehicleId);
    const complaint = task.complaintId;
    if (!vehicle || !complaint?.location?.coordinates) continue;

    taskedVehicleIds.add(vehicle._id.toString());
    const current = vehicle.currentLocation?.coordinates || [77.5946, 12.9716];
    const target = complaint.location.coordinates;
    const { nextCoords, arrived, remainingKm } = stepCoordinates(current, target);
    const prevHeading = vehicle.locationHistory?.[vehicle.locationHistory.length - 1]?.heading ?? 0;
    const heading =
      current[0] === nextCoords[0] && current[1] === nextCoords[1]
        ? prevHeading
        : computeHeadingDegrees(current, nextCoords);
    const speedKmh = arrived ? 0 : Math.round(36 + (vehicle.locationHistory.length % 13));
    const etaMinutes = arrived ? 0 : Math.max(1, Math.ceil((remainingKm / 40) * 60));

    vehicle.currentLocation = { type: 'Point', coordinates: nextCoords };
    vehicle.locationUpdatedAt = new Date();
    vehicle.status = 'in_transit';
    vehicle.locationHistory.push({
      coordinates: nextCoords,
      speedKmh,
      heading,
      recordedAt: new Date()
    });
    if (vehicle.locationHistory.length > 50) {
      vehicle.locationHistory = vehicle.locationHistory.slice(-50);
    }
    await vehicle.save();

    const notified = new Set(task.milestonesNotified || []);

    if (!notified.has('departed')) {
      notified.add('departed');
      task.status = arrived ? 'in_progress' : 'en_route';
      if (!task.startedAt) task.startedAt = new Date();
      task.statusHistory.push({
        status: task.status,
        note: `Vehicle ${vehicle.registrationNumber} departed toward ${complaint.address} (ETA ${etaMinutes} min).`,
        updatedBy: actor?._id
      });

      await Complaint.findByIdAndUpdate(complaint._id, {
        status: 'in_progress',
        $push: {
          statusHistory: {
            status: 'in_progress',
            note: `Vehicle ${vehicle.registrationNumber} is en route (ETA ~${etaMinutes} min).`,
            changedBy: actor?._id
          }
        }
      });

      await dispatchNotification({
        recipientId: complaint.citizenId,
        recipientRole: 'citizen',
        type: 'task_updated',
        title: `Vehicle En Route (${complaint.complaintCode})`,
        message: `${vehicle.name} (${vehicle.registrationNumber}) is heading to ${complaint.address}. Estimated arrival: ${etaMinutes} min (${remainingKm} km away).`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaint._id,
        sendEmail: true
      });
      milestoneEvents.push({ taskCode: task.taskCode, milestone: 'departed', complaintCode: complaint.complaintCode });
    }

    if (!arrived && remainingKm <= 0.45 && !notified.has('approaching')) {
      notified.add('approaching');
      await dispatchNotification({
        recipientId: complaint.citizenId,
        recipientRole: 'citizen',
        type: 'task_updated',
        title: `Collection Truck Approaching (${complaint.complaintCode})`,
        message: `${vehicle.registrationNumber} is ${Math.round(remainingKm * 1000)}m away from ${complaint.address} (~${etaMinutes} min).`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaint._id,
        sendEmail: true
      });
      milestoneEvents.push({ taskCode: task.taskCode, milestone: 'approaching', complaintCode: complaint.complaintCode });
    }

    if (arrived && !notified.has('arrived')) {
      notified.add('arrived');
      task.status = 'in_progress';
      task.statusHistory.push({
        status: 'in_progress',
        note: `Vehicle ${vehicle.registrationNumber} arrived at ${complaint.address}.`,
        updatedBy: actor?._id
      });

      await Promise.all([
        dispatchNotification({
          recipientId: complaint.citizenId,
          recipientRole: 'citizen',
          type: 'task_updated',
          title: `Vehicle Arrived On-Site (${complaint.complaintCode})`,
          message: `${vehicle.name} (${vehicle.registrationNumber}) has arrived at ${complaint.address} to clear your reported waste.`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint._id,
          sendEmail: true
        }),
        task.assignedWorkerId?.userId
          ? dispatchNotification({
              recipientId: task.assignedWorkerId.userId,
              recipientRole: 'worker',
              type: 'task_updated',
              title: `Vehicle Arrived (${task.taskCode})`,
              message: `${vehicle.registrationNumber} reached ${complaint.address}. Ready for collection completion.`,
              relatedEntityType: 'task',
              relatedEntityId: task._id,
              sendEmail: true
            })
          : Promise.resolve(),
        ...admins.map((a) =>
          dispatchNotification({
            recipientId: a._id,
            recipientRole: 'admin',
            type: 'task_updated',
            title: `Arrival Alert: ${task.taskCode}`,
            message: `${vehicle.registrationNumber} arrived at ${complaint.complaintCode} (${complaint.address}).`,
            relatedEntityType: 'task',
            relatedEntityId: task._id,
            sendEmail: true
          })
        )
      ]);

      milestoneEvents.push({ taskCode: task.taskCode, milestone: 'arrived', complaintCode: complaint.complaintCode });
    }

    task.milestonesNotified = Array.from(notified);
    await task.save();

    updates.push({
      vehicleId: vehicle._id,
      registrationNumber: vehicle.registrationNumber,
      coordinates: nextCoords,
      speedKmh,
      heading,
      taskCode: task.taskCode,
      distanceKm: remainingKm,
      etaMinutes,
      arrived
    });
  }

  // Smooth urban patrol loop for idle available/in_transit vehicles
  const patrolFilter = vehicleId
    ? { _id: vehicleId }
    : { status: { $in: ['available', 'in_transit'] } };
  const idleVehicles = await Vehicle.find(patrolFilter).populate('assignedZoneId', 'center');

  for (const v of idleVehicles) {
    if (taskedVehicleIds.has(v._id.toString())) continue;
    const center = v.assignedZoneId?.center?.coordinates || v.currentLocation?.coordinates || [77.595, 12.972];
    const seedOffset = v.registrationNumber.charCodeAt(v.registrationNumber.length - 1) || 0;
    const cur = v.currentLocation?.coordinates || center;
    const dLng = cur[0] - center[0];
    const dLat = (cur[1] - center[1]) / 0.82;
    const baseAngle =
      Math.hypot(dLng, dLat) < 0.0005 ? (seedOffset * 37 * Math.PI) / 180 : Math.atan2(dLat, dLng);
    const angle = baseAngle + (26 * Math.PI) / 180;
    const radiusDeg = 0.0065 + (seedOffset % 3) * 0.0018;
    const nextCoords = [
      Number((center[0] + Math.cos(angle) * radiusDeg).toFixed(6)),
      Number((center[1] + Math.sin(angle) * radiusDeg * 0.82).toFixed(6))
    ];
    const heading = computeHeadingDegrees(cur, nextCoords);
    const speedKmh = 32 + (Math.floor(Date.now() / 1200 + seedOffset) % 11);

    v.currentLocation = { type: 'Point', coordinates: nextCoords };
    v.locationUpdatedAt = new Date();
    v.locationHistory.push({ coordinates: nextCoords, speedKmh, heading, recordedAt: new Date() });
    if (v.locationHistory.length > 50) v.locationHistory = v.locationHistory.slice(-50);
    await v.save();

    updates.push({
      vehicleId: v._id,
      registrationNumber: v.registrationNumber,
      coordinates: nextCoords,
      speedKmh,
      heading,
      patrol: true
    });
  }

  lastStepAt = Date.now();
  return {
    stepAt: new Date(lastStepAt).toISOString(),
    movedCount: updates.length,
    updates,
    milestoneEvents
  };
}

export async function maybeAutoSimulateStep(minIntervalMs = 3000) {
  if (
    simulationPaused ||
    stepInFlight ||
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.DISABLE_AUTO_SIMULATION === 'true'
  ) {
    return null;
  }

  const now = Date.now();
  if (now - lastStepAt < minIntervalMs) {
    return null;
  }

  stepInFlight = true;
  try {
    return await simulateFleetStep();
  } catch (err) {
    console.warn('[Auto Fleet Simulation Warning]', err?.message || err);
    return null;
  } finally {
    stepInFlight = false;
  }
}
