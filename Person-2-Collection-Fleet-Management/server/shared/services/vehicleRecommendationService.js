import { GoogleGenAI } from '@google/genai';
import { Vehicle } from '../models/Vehicle.js';
import { CollectionTask } from '../models/CollectionTask.js';

export function haversineKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

const VEHICLE_CATEGORY_DEFAULTS = {
  hazmat_van: ['hazardous', 'medical', 'electronic'],
  compactor: ['mixed', 'organic', 'plastic', 'recyclable', 'other'],
  tipper: ['construction', 'mixed', 'organic'],
  mini_truck: ['organic', 'recyclable', 'plastic', 'electronic', 'mixed'],
  e_rickshaw: ['organic', 'recyclable', 'plastic', 'other']
};

/**
 * Deterministic vehicle recommendation algorithm.
 * Gemini may optionally provide a human-readable explanation, but NEVER alters scores or constraints.
 */
export async function recommendVehicles({
  coordinates,
  wasteCategory = 'mixed',
  estimatedWeightKg = 50,
  zoneId = null,
  includeAiExplanation = false
}) {
  const vehicles = await Vehicle.find({
    status: { $in: ['available', 'assigned', 'in_transit'] }
  })
    .populate('operatorId', 'name email phone')
    .populate('assignedZoneId', 'name code')
    .lean();

  const activeTasksAgg = await CollectionTask.aggregate([
    { $match: { status: { $in: ['assigned', 'accepted', 'en_route', 'in_progress'] } } },
    { $group: { _id: '$assignedVehicleId', count: { $sum: 1 } } }
  ]);
  const activeTaskMap = new Map(activeTasksAgg.map((a) => [a._id.toString(), a.count]));

  const evaluated = vehicles.map((v) => {
    const remainingCapacity = Math.max(0, (v.capacityKg || 0) - (v.currentLoadKg || 0));
    const capacityOk = remainingCapacity >= estimatedWeightKg;
    const supported =
      v.supportedWasteCategories?.length > 0
        ? v.supportedWasteCategories
        : VEHICLE_CATEGORY_DEFAULTS[v.type] || ['mixed'];
    const categoryMatch = supported.includes(wasteCategory);
    const hazardConstraintOk =
      wasteCategory === 'hazardous' || wasteCategory === 'medical'
        ? v.type === 'hazmat_van' || categoryMatch
        : true;

    const distanceKm = v.currentLocation?.coordinates
      ? haversineKm(coordinates, v.currentLocation.coordinates)
      : 25;
    const activeAssignments = activeTaskMap.get(v._id.toString()) || 0;

    // Deterministic weighted scoring (0-100)
    const availabilityScore = v.status === 'available' ? 30 : v.status === 'assigned' ? 16 : 8;
    const distanceScore = Math.max(0, 25 - distanceKm * 1.8);
    const capacityRatio = capacityOk ? Math.min(1, remainingCapacity / Math.max(estimatedWeightKg, 1)) : 0;
    const capacityScore = capacityOk ? Math.min(20, 10 + capacityRatio * 3) : 0;
    const categoryScore = categoryMatch ? 18 : 4;
    const zoneBonus = zoneId && v.assignedZoneId?._id?.toString() === zoneId.toString() ? 7 : 0;
    const workloadPenalty = activeAssignments * 8;

    const eligible = capacityOk && hazardConstraintOk;
    const totalScore = eligible
      ? Math.max(
          1,
          Math.min(
            100,
            Math.round(
              availabilityScore + distanceScore + capacityScore + categoryScore + zoneBonus - workloadPenalty
            )
          )
        )
      : 0;

    return {
      vehicle: v,
      eligible,
      ineligibleReason: !capacityOk
        ? `Insufficient remaining capacity (${remainingCapacity}kg < ${estimatedWeightKg}kg)`
        : !hazardConstraintOk
        ? `Vehicle type '${v.type}' not cleared for '${wasteCategory}' waste`
        : null,
      score: totalScore,
      distanceKm,
      remainingCapacityKg: remainingCapacity,
      activeAssignments,
      categoryMatch,
      breakdown: {
        availabilityScore: Number(availabilityScore.toFixed(1)),
        distanceScore: Number(distanceScore.toFixed(1)),
        capacityScore: Number(capacityScore.toFixed(1)),
        categoryScore,
        zoneBonus,
        workloadPenalty
      }
    };
  });

  evaluated.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.distanceKm - b.distanceKm;
  });

  let aiExplanation = null;
  if (includeAiExplanation && evaluated.length > 0 && evaluated[0].eligible) {
    aiExplanation = await explainTopRecommendation(evaluated[0], wasteCategory, estimatedWeightKg);
  }

  return {
    recommendations: evaluated,
    topRecommendation: evaluated.find((r) => r.eligible) || null,
    aiExplanation
  };
}

async function explainTopRecommendation(top, wasteCategory, estimatedWeightKg) {
  const fallback = `${top.vehicle.name} (${top.vehicle.type}) scored ${top.score}/100: ${top.distanceKm} km away, ${top.remainingCapacityKg}kg remaining capacity for ${estimatedWeightKg}kg of ${wasteCategory} waste, with ${top.activeAssignments} active task(s).`;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await Promise.race([
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
        contents: `Summarize in 2 concise sentences why vehicle "${top.vehicle.name}" (${top.vehicle.type}) was deterministically ranked #1 for ${estimatedWeightKg}kg of ${wasteCategory} waste: score=${top.score}/100, distance=${top.distanceKm}km, remainingCapacity=${top.remainingCapacityKg}kg, activeTasks=${top.activeAssignments}.`
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    return (resp.text || '').trim() || fallback;
  } catch {
    return fallback;
  }
}
