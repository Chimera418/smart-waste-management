import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { Complaint } from '../models/Complaint.js';
import { PRIORITY_LEVELS, WASTE_CATEGORIES } from '../config/constants.js';

const categorizationSchema = z.object({
  suggestedCategory: z.enum(WASTE_CATEGORIES),
  confidence: z.number().min(0).max(1),
  issueType: z.string().min(2).max(120),
  summary: z.string().min(5).max(300),
  keywords: z.array(z.string()).max(8)
});

const prioritySchema = z.object({
  suggestedPriority: z.enum(PRIORITY_LEVELS),
  score: z.number().min(0).max(100),
  reasoning: z.string().min(5).max(400)
});

const duplicateCompareSchema = z.object({
  likelySameIncident: z.boolean(),
  contextualSimilarity: z.number().min(0).max(1),
  reason: z.string().min(3).max(240)
});

const PRIORITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };
const SLA_HOURS = { low: 72, medium: 48, high: 16, critical: 6 };

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
}

function getGeminiTimeoutMs() {
  return process.env.VERCEL === '1' ? 8500 : 25000;
}

export function computeSlaDeadline(priority, fromDate = new Date()) {
  const hours = SLA_HOURS[priority] || 48;
  return new Date(fromDate.getTime() + hours * 3600 * 1000);
}

function deterministicCategorize(description) {
  const text = description.toLowerCase();
  const rules = [
    { cat: 'medical', words: ['syringe', 'needle', 'hospital', 'medical', 'biohazard', 'bandage', 'clinic'], issue: 'Biomedical / Clinical Waste Risk' },
    { cat: 'hazardous', words: ['chemical', 'acid', 'toxic', 'paint', 'battery', 'oil', 'spill', 'asbestos', 'gas'], issue: 'Hazardous Material Spill / Dumping' },
    { cat: 'electronic', words: ['ewaste', 'e-waste', 'laptop', 'monitor', 'phone', 'circuit', 'cable', 'appliance'], issue: 'Discarded Electronic Equipment' },
    { cat: 'construction', words: ['rubble', 'concrete', 'brick', 'cement', 'debris', 'demolition', 'timber', 'tile'], issue: 'Construction & Demolition Debris' },
    { cat: 'organic', words: ['food', 'rotting', 'kitchen', 'vegetable', 'garden', 'leaves', 'compost', 'smell', 'dead'], issue: 'Decomposing Organic Waste Accumulation' },
    { cat: 'plastic', words: ['plastic', 'bottle', 'polythene', 'wrapper', 'packaging', 'bag'], issue: 'Plastic Litter & Packaging Accumulation' },
    { cat: 'recyclable', words: ['paper', 'cardboard', 'glass', 'metal', 'tin', 'aluminum', 'scrap'], issue: 'Dry Recyclable Material Overflow' }
  ];

  let matched = null;
  let matchedKeywords = [];
  for (const rule of rules) {
    const hits = rule.words.filter((w) => text.includes(w));
    if (hits.length > matchedKeywords.length) {
      matched = rule;
      matchedKeywords = hits;
    }
  }

  const suggestedCategory = matched ? matched.cat : 'mixed';
  const issueType = matched ? matched.issue : 'Overflowing Municipal Mixed Waste';
  const confidence = matched ? Math.min(0.94, 0.72 + matchedKeywords.length * 0.06) : 0.65;
  const keywords =
    matchedKeywords.length > 0
      ? matchedKeywords.slice(0, 5)
      : text.split(/\W+/).filter((w) => w.length > 4).slice(0, 4);

  return {
    suggestedCategory,
    confidence: Number(confidence.toFixed(2)),
    issueType,
    summary: description.trim().slice(0, 180),
    keywords,
    modelUsed: 'deterministic-fallback',
    fallbackUsed: true
  };
}

export async function categorizeWasteComplaint({ title = '', description }) {
  const client = getGeminiClient();
  if (!client) return deterministicCategorize(`${title} ${description}`);

  try {
    const prompt = `You are a municipal waste classification engine. Analyze the complaint and respond strictly in JSON:
{
  "suggestedCategory": one of ${JSON.stringify(WASTE_CATEGORIES)},
  "confidence": number between 0 and 1,
  "issueType": short phrase describing issue,
  "summary": concise 1-sentence summary,
  "keywords": array of up to 6 key terms
}
Title: ${title}
Description: ${description}`;

    const resp = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
    ]);

    const validated = categorizationSchema.parse(JSON.parse(resp.text || '{}'));
    return { ...validated, modelUsed: getModelName(), fallbackUsed: false };
  } catch (err) {
    console.warn('[Gemini categorize fallback]', err?.message || err);
    return deterministicCategorize(`${title} ${description}`);
  }
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
  const client = getGeminiClient();
  if (client) {
    try {
      const prompt = `Estimate municipal waste complaint priority. Respond strictly in JSON:
{"suggestedPriority": one of ${JSON.stringify(PRIORITY_LEVELS)}, "score": integer 0..100, "reasoning": concise 1-2 sentence explanation}
Description: ${description}
Waste Category: ${wasteCategory}
Submission Hour (UTC): ${new Date(submittedAt).getUTCHours()}
Nearby Active Complaints within 1km: ${nearbyCount}`;

      const resp = await Promise.race([
        client.models.generateContent({
          model: getModelName(),
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
      ]);
      const parsed = prioritySchema.parse(JSON.parse(resp.text || '{}'));
      raw = { ...parsed, modelUsed: getModelName(), fallbackUsed: false };
    } catch (err) {
      console.warn('[Gemini priority fallback]', err?.message || err);
      raw = null;
    }
  }

  if (!raw) {
    const text = description.toLowerCase();
    let score = 45;
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
      text.includes('toxic')
    ) {
      score = Math.max(score, 90);
      suggestedPriority = 'critical';
    } else if (wasteCategory === 'recyclable' || wasteCategory === 'other') {
      score = 32;
      suggestedPriority = 'low';
    }
    raw = {
      suggestedPriority,
      score,
      reasoning: `Evaluated ${wasteCategory} waste with ${nearbyCount} nearby active complaint(s).`,
      modelUsed: 'deterministic-fallback',
      fallbackUsed: true
    };
  }

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
    validatedPriority = PRIORITY_LEVELS[Math.min(3, PRIORITY_RANK[validatedPriority] + 1)];
    ruleAdjustments.push(`Density rule: ${nearbyCount} nearby active complaints boosted priority.`);
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

export async function compareDuplicateContext(newText, existingText) {
  const client = getGeminiClient();
  if (!client) return null;
  try {
    const prompt = `Compare these two municipal waste complaints to assess if they describe the same incident. Strict JSON:
{"likelySameIncident": boolean, "contextualSimilarity": number 0..1, "reason": short explanation}
New: ${newText}
Existing: ${existingText}`;

    const resp = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    return duplicateCompareSchema.parse(JSON.parse(resp.text || '{}'));
  } catch {
    return null;
  }
}

export async function chatWithCitizen({ message, history = [] }) {
  const client = getGeminiClient();
  if (!client) return buildCitizenChatFallback(message);

  try {
    const recent = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Citizen' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are CivicClean Assistant, a helpful municipal waste-management chatbot.
Explain waste categories (organic, recyclable, plastic, electronic, hazardous, construction, medical, mixed, other), guide complaint submission, and share safe disposal practices concisely.
${recent ? `\nConversation:\n${recent}\n` : ''}Citizen: ${message}\nAssistant:`;

    const resp = await Promise.race([
      client.models.generateContent({ model: getModelName(), contents: prompt }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
    ]);
    const reply = (resp.text || '').trim();
    if (!reply) throw new Error('Empty');
    return { reply, modelUsed: getModelName(), fallbackUsed: false };
  } catch (err) {
    console.warn('[Gemini chat fallback]', err?.message || err);
    return buildCitizenChatFallback(message);
  }
}

function buildCitizenChatFallback(message) {
  const q = message.toLowerCase();
  let reply =
    'I can help you pick the right waste category, follow safe disposal steps, or file a text-based complaint with GPS coordinates.';
  if (q.includes('categor') || q.includes('type')) {
    reply =
      'CivicClean tracks 9 categories: Organic, Recyclable, Plastic, Electronic (e-waste), Hazardous, Construction debris, Medical, Mixed, and Other.';
  } else if (q.includes('hazard') || q.includes('battery') || q.includes('chemical') || q.includes('medical')) {
    reply =
      'Do not place hazardous or medical waste in household bins. Keep it sealed away from storm drains and file a complaint under "hazardous" or "medical" for specialized Hazmat Van pickup.';
  } else if (q.includes('submit') || q.includes('report') || q.includes('complaint')) {
    reply =
      'Open "Submit Complaint", write a plain-text description, click "Gemini AI Suggest Category", pin the location on the map (or Use GPS), and submit. Track progress live under "My Complaints".';
  }
  return { reply, modelUsed: 'deterministic-fallback', fallbackUsed: true };
}
