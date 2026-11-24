import { Complaint } from '../models/Complaint.js';
import { CollectionTask } from '../models/CollectionTask.js';
import { CollectionZone } from '../models/CollectionZone.js';
import { Vehicle } from '../models/Vehicle.js';
import { Worker } from '../models/Worker.js';
import { Escalation } from '../models/Escalation.js';

export async function getAnalyticsSummary() {
  const [
    totalComplaints,
    statusAgg,
    categoryAgg,
    priorityAgg,
    resolutionAgg,
    totalTasks,
    completedTasks,
    totalVehicles,
    totalWorkers,
    openEscalations
  ] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $group: { _id: '$wasteCategory', count: { $sum: 1 }, estimatedKg: { $sum: '$estimatedWeightKg' } } },
      { $sort: { count: -1 } }
    ]),
    Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
      {
        $project: {
          resolutionHours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
          withinSla: {
            $cond: [{ $lte: ['$resolvedAt', { $ifNull: ['$slaDeadline', '$resolvedAt'] }] }, 1, 0]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionHours: { $avg: '$resolutionHours' },
          slaMetCount: { $sum: '$withinSla' },
          resolvedCount: { $sum: 1 }
        }
      }
    ]),
    CollectionTask.countDocuments(),
    CollectionTask.countDocuments({ status: 'completed' }),
    Vehicle.countDocuments(),
    Worker.countDocuments(),
    Escalation.countDocuments({ resolved: false })
  ]);

  const statusMap = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
  const resolvedCount = statusMap.resolved || 0;
  const pendingCount = totalComplaints - resolvedCount - (statusMap.rejected || 0);
  const resMetrics = resolutionAgg[0] || { avgResolutionHours: 0, slaMetCount: 0, resolvedCount: 0 };

  return {
    totalComplaints,
    resolvedComplaints: resolvedCount,
    pendingComplaints: Math.max(0, pendingCount),
    collectionEfficiencyPct:
      totalComplaints > 0 ? Number(((resolvedCount / totalComplaints) * 100).toFixed(1)) : 0,
    avgResolutionHours: Number((resMetrics.avgResolutionHours || 0).toFixed(1)),
    slaCompliancePct:
      resMetrics.resolvedCount > 0
        ? Number(((resMetrics.slaMetCount / resMetrics.resolvedCount) * 100).toFixed(1))
        : 100,
    totalTasks,
    completedTasks,
    totalVehicles,
    totalWorkers,
    openEscalations,
    byStatus: statusAgg.map((s) => ({ status: s._id, count: s.count })),
    byCategory: categoryAgg.map((c) => ({
      category: c._id,
      count: c.count,
      estimatedKg: c.estimatedKg || 0
    })),
    byPriority: priorityAgg.map((p) => ({ priority: p._id, count: p.count }))
  };
}

export async function getWasteTrends(days = 14) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await Complaint.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        complaints: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        estimatedWeightKg: { $sum: '$estimatedWeightKg' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return rows.map((r) => ({
    date: r._id,
    complaints: r.complaints,
    resolved: r.resolved,
    estimatedWeightKg: r.estimatedWeightKg || 0
  }));
}

export async function getZoneStats() {
  const [zones, complaintByZone, taskByZone] = await Promise.all([
    CollectionZone.find({ isActive: true }).select('name code wardNumber').lean(),
    Complaint.aggregate([
      { $match: { zoneId: { $ne: null } } },
      {
        $group: {
          _id: '$zoneId',
          totalComplaints: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['submitted', 'under_review', 'assigned', 'in_progress']] }, 1, 0]
            }
          }
        }
      }
    ]),
    CollectionTask.aggregate([
      { $match: { zoneId: { $ne: null } } },
      {
        $group: {
          _id: '$zoneId',
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          collectedKg: { $sum: '$collectedWeightKg' }
        }
      }
    ])
  ]);

  const cMap = new Map(complaintByZone.map((c) => [c._id.toString(), c]));
  const tMap = new Map(taskByZone.map((t) => [t._id.toString(), t]));

  return zones.map((z) => {
    const c = cMap.get(z._id.toString()) || { totalComplaints: 0, resolved: 0, pending: 0 };
    const t = tMap.get(z._id.toString()) || { totalTasks: 0, completedTasks: 0, collectedKg: 0 };
    return {
      zoneId: z._id,
      name: z.name,
      code: z.code,
      totalComplaints: c.totalComplaints,
      resolvedComplaints: c.resolved,
      pendingComplaints: c.pending,
      totalTasks: t.totalTasks,
      completedTasks: t.completedTasks,
      collectedKg: t.collectedKg
    };
  });
}

export async function getFleetUtilization() {
  const vehicles = await Vehicle.find().lean();
  const tasksAgg = await CollectionTask.aggregate([
    {
      $group: {
        _id: '$assignedVehicleId',
        totalAssigned: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        collectedKg: { $sum: '$collectedWeightKg' }
      }
    }
  ]);
  const map = new Map(tasksAgg.map((t) => [t._id?.toString(), t]));
  return vehicles.map((v) => {
    const t = map.get(v._id.toString()) || { totalAssigned: 0, completed: 0, collectedKg: 0 };
    return {
      vehicleId: v._id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      status: v.status,
      capacityKg: v.capacityKg,
      currentLoadKg: v.currentLoadKg || 0,
      utilizationPct: Math.min(100, Math.round(((v.currentLoadKg || 0) / v.capacityKg) * 100)),
      totalAssigned: t.totalAssigned,
      completedTrips: Math.max(v.totalTripsCompleted || 0, t.completed),
      collectedKg: Math.max(v.totalWasteCollectedKg || 0, t.collectedKg)
    };
  });
}

export async function getWorkerWorkload() {
  const workers = await Worker.find().populate('userId', 'name email').lean();
  return workers.map((w) => ({
    workerId: w._id,
    employeeCode: w.employeeCode,
    name: w.userId?.name || w.employeeCode,
    availability: w.availability,
    activeTaskCount: w.activeTaskCount || 0,
    completedTasksCount: w.completedTasksCount || 0
  }));
}

export async function getGeospatialHotspots() {
  const clusters = await Complaint.aggregate([
    {
      $project: {
        priority: 1,
        status: 1,
        lng: { $arrayElemAt: ['$location.coordinates', 0] },
        lat: { $arrayElemAt: ['$location.coordinates', 1] }
      }
    },
    {
      $group: {
        _id: {
          latBucket: { $round: ['$lat', 2] },
          lngBucket: { $round: ['$lng', 2] }
        },
        count: { $sum: 1 },
        activeCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['submitted', 'under_review', 'assigned', 'in_progress']] }, 1, 0]
          }
        },
        criticalOrHigh: {
          $sum: { $cond: [{ $in: ['$priority', ['high', 'critical']] }, 1, 0] }
        },
        centerLat: { $avg: '$lat' },
        centerLng: { $avg: '$lng' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);

  const zones = await CollectionZone.find({ isActive: true }).select('name code boundary center').lean();
  const zoneDensity = await getZoneStats();

  return {
    hotspots: clusters.map((c) => ({
      lat: Number(c.centerLat.toFixed(5)),
      lng: Number(c.centerLng.toFixed(5)),
      count: c.count,
      activeCount: c.activeCount,
      criticalOrHigh: c.criticalOrHigh,
      severity: c.count >= 5 || c.criticalOrHigh >= 2 ? 'high' : c.count >= 3 ? 'medium' : 'low'
    })),
    zones,
    zoneDensity
  };
}
