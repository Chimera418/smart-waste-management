import { Complaint } from '../models/Complaint.js';
import { compareDuplicateContext } from './geminiService.js';

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for', 'with',
  'near', 'by', 'from', 'this', 'that', 'there', 'here', 'been', 'have', 'has', 'are'
]);

function tokenize(text = '') {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

export function computeTextSimilarity(textA, textB) {
  const setA = tokenize(textA);
  const setB = tokenize(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function detectPotentialDuplicates({
  title = '',
  description,
  coordinates,
  wasteCategory,
  excludeComplaintId = null,
  useAiContext = true
}) {
  const query = {
    status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: 500
      }
    }
  };
  if (excludeComplaintId) query._id = { $ne: excludeComplaintId };

  const nearby = await Complaint.find(query).limit(10).lean();
  const inputText = `${title} ${description}`;
  const candidates = [];

  for (const item of nearby) {
    const distanceMeters = haversineMeters(coordinates, item.location.coordinates);
    const lexicalScore = computeTextSimilarity(inputText, `${item.title} ${item.description}`);
    const categoryBonus = wasteCategory && item.wasteCategory === wasteCategory ? 0.15 : 0;
    const proximityBonus = distanceMeters <= 120 ? 0.25 : distanceMeters <= 300 ? 0.12 : 0.05;
    let combinedScore = Math.min(1, Number((lexicalScore * 0.65 + categoryBonus + proximityBonus).toFixed(2)));
    let reason = `Within ${distanceMeters}m (${Math.round(lexicalScore * 100)}% keyword overlap)`;

    if (useAiContext && combinedScore >= 0.42 && candidates.length === 0) {
      const aiCheck = await compareDuplicateContext(inputText, `${item.title} ${item.description}`);
      if (aiCheck) {
        combinedScore = Number(((combinedScore + aiCheck.contextualSimilarity) / 2).toFixed(2));
        reason = `${aiCheck.reason} (${distanceMeters}m away)`;
      }
    }

    if (combinedScore >= 0.4) {
      candidates.push({
        complaintId: item._id,
        complaintCode: item.complaintCode,
        title: item.title,
        status: item.status,
        similarityScore: combinedScore,
        distanceMeters,
        reason
      });
    }
  }

  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  const highestSimilarity = candidates.length > 0 ? candidates[0].similarityScore : 0;

  return {
    isPotentialDuplicate: candidates.length > 0 && highestSimilarity >= 0.5,
    highestSimilarity,
    candidates: candidates.slice(0, 5),
    reviewedByAdmin: false
  };
}
