import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { Complaint } from '../models/Complaint.js';
import { PRIORITY_LEVELS } from '../config/constants.js';

const prioritySchema = z.object({
  suggestedPriority: z.enum(PRIORITY_LEVELS),
  score: z.number().min(0).max(100),
  reasoning: z.string().min(5).max(400)
});

const PRIORITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };
const SLA_HOURS = { low: 72, medium: 48, high: 16, critical: 6 };

function boostPriority(level) {
  const idx = PRIORITY_RANK[level] ?? 1;
  return PRIORITY_LEVELS[Math.min(3, idx + 1)];
}

export function computeSlaDeadline(priority, fromDate = new Date()) {
  const hours = SLA_HOURS[priority] || 48;
  return new Date(fromDate.getTime() + hours * 3600 * 1000);
}

function deterministicPriority(description, wasteCategory, nearbyCount) {
  const text = description.toLowerCase();
  let score = 40;
  let suggestedPriority = 'medium';

  if (wasteCategory === 'hazardous' || wasteCategory === 'medical') {
    score = 82;
    suggestedPriority = 'high';
  }
  if (
    text.includes('school') ||
    text.includes('hospital') ||
    text.includes('drain') ||
    text.includes('fire') ||
    text.includes('toxic') ||
    text.includes('flood')
  ) {
    score = Math.max(score, 90);
    suggestedPriority = 'critical';
  } else if (wasteCategory === 'organic' && (text.includes('rot') || text.includes('smell'))) {
    score = Math.max(score, 68);
    suggestedPriority = 'high';
  } else if (wasteCategory === 'recyclable' || wasteCategory === 'other') {
    score = 32;
    suggestedPriority = 'low';
  }

  if (nearbyCount >= 5 && PRIORITY_RANK[suggestedPriority] < 3) {
    suggestedPriority = boostPriority(suggestedPriority);
    score = Math.min(98, score + 15);
  }

  return {
    suggestedPriority,
    score,
    reasoning: `Evaluated category (${wasteCategory}), hazard keywords, and ${nearbyCount} nearby active complaint(s).`,
    modelUsed: 'deterministic-fallback',
    fallbackUsed: true
  };
}

export async function estimateComplaintPriority({
  description,
  wasteCategory,
  coordinates,
  submittedAt = new Date()
}) {
  const nearbyCount = await Complaint.countDocuments({
    status: { $in: ['submitted', 'under_review', 'assigned', 'in_progress'] },
    location: {
      $geoWithin: {
        $centerSphere: [coordinates, 1 / 6378.1]
      }
    }
  });

  let raw = null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
      const prompt = `Estimate municipal waste complaint priority. Respond strictly in JSON:
{"suggestedPriority": one of ${JSON.stringify(PRIORITY_LEVELS)}, "score": integer 0..100, "reasoning": concise 1-2 sentence justification}
Description: ${description}
Waste Category: ${wasteCategory}
Submission Hour (UTC): ${new Date(submittedAt).getUTCHours()}
Nearby Active Complaints within 1km: ${nearbyCount}`;

      const resp = await Promise.race([
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7500))
      ]);
      const parsed = prioritySchema.parse(JSON.parse(resp.text || '{}'));
      raw = { ...parsed, modelUsed: model, fallbackUsed: false };
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    raw = deterministicPriority(description, wasteCategory, nearbyCount);
  }

  // Predefined validation & safety rules (AI cannot downgrade hazardous/medical below high)
  const ruleAdjustments = [];
  let validatedPriority = raw.suggestedPriority;
  if (
    (wasteCategory === 'hazardous' || wasteCategory === 'medical') &&
    PRIORITY_RANK[validatedPriority] < PRIORITY_RANK.high
  ) {
    validatedPriority = 'high';
    ruleAdjustments.push('Safety rule: hazardous/medical waste requires minimum HIGH priority.');
  }
  if (nearbyCount >= 5 && PRIORITY_RANK[validatedPriority] < PRIORITY_RANK.critical) {
    validatedPriority = boostPriority(validatedPriority);
    ruleAdjustments.push(`Density rule: ${nearbyCount} nearby complaints boosted priority.`);
  }

  return {
    suggestedPriority: validatedPriority,
    score: raw.score,
    reasoning: raw.reasoning,
    ruleAdjustments,
    nearbyDensityCount: nearbyCount,
    slaDeadline: computeSlaDeadline(validatedPriority, new Date(submittedAt)),
    modelUsed: raw.modelUsed,
    fallbackUsed: raw.fallbackUsed
  };
}
