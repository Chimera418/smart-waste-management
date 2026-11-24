import { Vehicle } from '../models/Vehicle.js';
import { CollectionTask } from '../models/CollectionTask.js';
import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { haversineKm } from './vehicleRecommendationService.js';
import { dispatchNotification } from './notificationService.js';

let simulationPaused = false;
let lastStepAt = 0;
let stepInFlight = false;
const patrolWaypointIndex = new Map();

const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

// Realistic Bengaluru municipal road-corridor patrol loops (street intersections, not artificial circles)
const URBAN_PATROL_ROUTES = [
  // Central CBD corridor: MG Road -> Brigade Rd -> Residency Rd -> Richmond Circle -> Kasturba Rd -> Cubbon Park -> Queens Rd -> Trinity
  [
    [77.6066, 12.9756],
    [77.6070, 12.9718],
    [77.6048, 12.9665],
    [77.5990, 12.9661],
    [77.5936, 12.9719],
    [77.5948, 12.9788],
    [77.6012, 12.9804],
    [77.6112, 12.9758]
  ],
  // East Indiranagar corridor: 100ft Rd -> CMH Rd -> 12th Main -> Domlur Flyover -> Old Airport Rd -> Ulsoor
  [
    [77.6408, 12.9784],
    [77.6442, 12.9722],
    [77.6410, 12.9648],
    [77.6365, 12.9605],
    [77.6288, 12.9642],
    [77.6248, 12.9728],
    [77.6315, 12.9792]
  ],
  // South Koramangala / Jayanagar corridor: Lalbagh -> Wilson Garden -> Dairy Circle -> Koramangala 80ft Rd -> Sony Signal -> Inner Ring Rd
  [
    [77.5855, 12.9480],
    [77.5948, 12.9462],
    [77.6018, 12.9396],
    [77.6145, 12.9348],
    [77.6258, 12.9362],
    [77.6240, 12.9465],
    [77.6105, 12.9522],
    [77.5955, 12.9548]
  ],
  // HSR / Bellandur / South-East corridor: Silk Board -> HSR 27th Main -> Agara -> Sarjapur Rd -> Haralur -> Kudlu
  [
    [77.6238, 12.9172],
    [77.6382, 12.9145],
    [77.6495, 12.9178],
    [77.6585, 12.9125],
    [77.6650, 12.9040],
    [77.6520, 12.8988],
    [77.6365, 12.9045]
  ]
];

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

function stepCoordinates([curLng, curLat], [dstLng, dstLat], maxDeg = 0.0048) {
  const dLng = dstLng - curLng;
  const dLat = dstLat - curLat;
  const distKm = haversineKm([curLng, curLat], [dstLng, dstLat]);

  if (distKm <= 0.09) {
    return { nextCoords: [dstLng, dstLat], arrived: true, remainingKm: 0 };
  }

  const mag = Math.hypot(dLng, dLat);
  const desiredDeg = Math.min(maxDeg, Math.max(0.0018, mag * 0.28));
  const ratio = mag > 0 ? Math.min(1, desiredDeg / mag) : 1;
  const nextLng = Number((curLng + dLng * ratio).toFixed(6));
  const nextLat = Number((curLat + dLat * ratio).toFixed(6));
  const remainingKm = haversineKm([nextLng, nextLat], [dstLng, dstLat]);

  return {
    nextCoords: [nextLng, nextLat],
    arrived: remainingKm <= 0.09,
    remainingKm
  };
}

function pickPatrolRoute(vehicle) {
  const code = vehicle.assignedZoneId?.code || '';
  if (code.includes('Z1') || vehicle.registrationNumber.includes('101')) return URBAN_PATROL_ROUTES[0];
  if (code.includes('Z2') || vehicle.registrationNumber.includes('309')) return URBAN_PATROL_ROUTES[1];
  if (code.includes('Z3') || vehicle.registrationNumber.includes('204')) return URBAN_PATROL_ROUTES[2];
  return URBAN_PATROL_ROUTES[3];
}

export async function simulateFleetStep({ vehicleId = null, actor = null } = {}) {
  const activeTaskFilter = {
    status: { $in: ['assigned', 'accepted', 'en_route', 'in_progress'] }
  };
  if (vehicleId) {
    activeTaskFilter.assignedVehicleId = vehicleId;
  }

  const rawActiveTasks = await CollectionTask.find(activeTaskFilter)
    .populate('complaintId', 'complaintCode title address location citizenId status assignedTaskId statusHistory')
    .populate('assignedWorkerId', 'userId')
    .sort({ createdAt: 1 });

  // Filter out superseded or already-resolved tasks, and guarantee AT MOST ONE active task drives a vehicle per tick
  const validTasks = rawActiveTasks.filter((t) => {
    const c = t.complaintId;
    if (!c || !c.location?.coordinates) return false;
    if (['resolved', 'rejected'].includes(c.status)) return false;
    if (c.assignedTaskId && String(c.assignedTaskId) !== String(t._id)) return false;
    return true;
  });

  // Prefer un-arrived tasks first, then highest priority, so a vehicle finishes driving to its active complaint
  validTasks.sort((a, b) => {
    const aArrived = (a.milestonesNotified || []).includes('arrived') ? 1 : 0;
    const bArrived = (b.milestonesNotified || []).includes('arrived') ? 1 : 0;
    if (aArrived !== bArrived) return aArrived - bArrived;
    return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
  });

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  const taskedVehicleIds = new Set();
  const updates = [];
  const milestoneEvents = [];

  for (const task of validTasks) {
    const vId = task.assignedVehicleId?.toString();
    if (!vId || taskedVehicleIds.has(vId)) continue;

    const vehicle = await Vehicle.findById(vId);
    const complaint = task.complaintId;
    if (!vehicle || !complaint?.location?.coordinates) continue;

    taskedVehicleIds.add(vId);
    const current = vehicle.currentLocation?.coordinates || [77.5946, 12.9716];
    const target = complaint.location.coordinates;
    const { nextCoords, arrived, remainingKm } = stepCoordinates(current, target, 0.0055);
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

  // Realistic street-corridor waypoint patrol for untasked active vehicles (no artificial circles!)
  const patrolFilter = vehicleId
    ? { _id: vehicleId }
    : { status: { $in: ['available', 'in_transit'] } };
  const idleVehicles = await Vehicle.find(patrolFilter).populate('assignedZoneId', 'code center');

  for (const v of idleVehicles) {
    const vId = v._id.toString();
    if (taskedVehicleIds.has(vId)) continue;

    const route = pickPatrolRoute(v);
    const cur = v.currentLocation?.coordinates || route[0];
    let wpIdx = patrolWaypointIndex.get(vId);
    if (typeof wpIdx !== 'number') {
      // Start toward the nearest forward waypoint along this vehicle's corridor
      let nearestIdx = 0;
      let nearestDist = Infinity;
      route.forEach((pt, idx) => {
        const d = haversineKm(cur, pt);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = idx;
        }
      });
      wpIdx = (nearestIdx + 1) % route.length;
      patrolWaypointIndex.set(vId, wpIdx);
    }

    const waypoint = route[wpIdx];
    const { nextCoords, arrived } = stepCoordinates(cur, waypoint, 0.0038);
    if (arrived) {
      patrolWaypointIndex.set(vId, (wpIdx + 1) % route.length);
    }

    const heading = computeHeadingDegrees(cur, nextCoords);
    const speedKmh = 30 + (Math.floor(Date.now() / 1200 + v.registrationNumber.charCodeAt(v.registrationNumber.length - 1)) % 12);

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

export async function maybeAutoSimulateStep(minIntervalMs = 1000) {
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
