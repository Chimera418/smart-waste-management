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

let cachedClient = null;
let cachedApiKey = '';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
}

function getGeminiTimeoutMs() {
  return process.env.VERCEL === '1' ? 8500 : 18000;
}

function buildFastJsonConfig(maxOutputTokens = 350) {
  return {
    responseMimeType: 'application/json',
    temperature: 0.2,
    maxOutputTokens,
    thinkingConfig: { thinkingBudget: 0 }
  };
}

export function computeSlaDeadline(priority, fromDate = new Date()) {
  const hours = SLA_HOURS[priority] || 48;
  return new Date(fromDate.getTime() + hours * 3600 * 1000);
}

function deterministicCategorize(description) {
  const text = description.toLowerCase();
  const rules = [
    { cat: 'medical', words: ['syringe', 'needle', 'hospital', 'medical', 'biohazard', 'bandage', 'clinic'], issue: 'Biomedical / Clinical Waste Risk' },
    { cat: 'hazardous', words: ['chemical', 'acid', 'toxic', 'paint', 'battery', 'batteries', 'oil', 'spill', 'asbestos', 'gas'], issue: 'Hazardous Material Spill / Dumping' },
    { cat: 'electronic', words: ['ewaste', 'e-waste', 'laptop', 'monitor', 'phone', 'circuit', 'cable', 'appliance', 'charger'], issue: 'Discarded Electronic Equipment' },
    { cat: 'construction', words: ['rubble', 'concrete', 'brick', 'cement', 'debris', 'demolition', 'timber', 'tile'], issue: 'Construction & Demolition Debris' },
    { cat: 'organic', words: ['organic', 'food', 'rotting', 'kitchen', 'vegetable', 'garden', 'leaves', 'compost', 'smell', 'wet waste', 'dead'], issue: 'Decomposing Organic Waste Accumulation' },
    { cat: 'plastic', words: ['plastic', 'bottle', 'polythene', 'wrapper', 'packaging', 'bag'], issue: 'Plastic Litter & Packaging Accumulation' },
    { cat: 'recyclable', words: ['recycl', 'paper', 'cardboard', 'glass', 'metal', 'tin', 'aluminum', 'scrap'], issue: 'Dry Recyclable Material Overflow' }
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
    const prompt = `Classify this municipal waste complaint into strict JSON:
{"suggestedCategory": one of ${JSON.stringify(WASTE_CATEGORIES)}, "confidence": 0..1, "issueType": "short phrase", "summary": "1-sentence summary", "keywords": ["up to 6 terms"]}
Title: ${title}
Description: ${description}`;

    const resp = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: buildFastJsonConfig(250)
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
    ]);

    const validated = categorizationSchema.parse(JSON.parse(resp.text || '{}'));
    return { ...validated, modelUsed: getModelName(), fallbackUsed: false };
  } catch (err) {
    console.warn('[AI categorize fallback]', err?.message || err);
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
      const prompt = `Estimate municipal waste complaint priority. Strict JSON:
{"suggestedPriority": one of ${JSON.stringify(PRIORITY_LEVELS)}, "score": 0..100, "reasoning": "1-2 sentences"}
Description: ${description}
Waste Category: ${wasteCategory}
Submission Hour (UTC): ${new Date(submittedAt).getUTCHours()}
Nearby Active Complaints within 1km: ${nearbyCount}`;

      const resp = await Promise.race([
        client.models.generateContent({
          model: getModelName(),
          contents: prompt,
          config: buildFastJsonConfig(220)
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
      ]);
      const parsed = prioritySchema.parse(JSON.parse(resp.text || '{}'));
      raw = { ...parsed, modelUsed: getModelName(), fallbackUsed: false };
    } catch (err) {
      console.warn('[AI priority fallback]', err?.message || err);
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
    const prompt = `Compare if these two municipal waste complaints describe the same incident. Strict JSON:
{"likelySameIncident": boolean, "contextualSimilarity": 0..1, "reason": "short explanation"}
New: ${newText}
Existing: ${existingText}`;

    const resp = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: buildFastJsonConfig(180)
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    return duplicateCompareSchema.parse(JSON.parse(resp.text || '{}'));
  } catch {
    return null;
  }
}

const chatIntentSchema = z.object({
  intent: z.enum(['check_status', 'submit_complaint', 'general_help']),
  reply: z.string().min(2).max(2000),
  complaintCode: z.string().nullable().optional().default(null),
  complaintDraft: z
    .object({
      title: z.string().max(160).nullish(),
      description: z.string().max(3000).nullish(),
      wasteCategory: z.enum(WASTE_CATEGORIES).nullish(),
      address: z.string().max(300).nullish(),
      landmark: z.string().max(150).nullish(),
      estimatedWeightKg: z.number().min(1).max(20000).nullish(),
      readyToSubmit: z.boolean().nullish()
    })
    .nullable()
    .optional()
    .default(null)
});

/**
 * Ultra-fast predefined matcher (<2ms):
 * Handles known quick prompts, complaint status checks, structured complaint submissions,
 * and standard municipal disposal FAQs immediately without waiting on an external LLM call.
 * Any open-ended, nuanced, or non-predefined question returns null and is routed to the LLM.
 */
function matchPredefinedCitizenIntent(message, userComplaints = [], userAddress = '') {
  const trimmed = message.trim();
  const q = trimmed.toLowerCase();
  const codeMatch = trimmed.match(/SWM-\d{4}-[A-Z0-9]+/i);

  // 1. Instant greeting / capabilities help
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|help|what can you do|menu)\b[!.?]*$/i.test(trimmed)) {
    return {
      intent: 'general_help',
      complaintCode: null,
      complaintDraft: null,
      reply:
        'Hello! I can help you instantly with:\n• Checking live status & assigned vehicle for your complaints\n• Filing a new waste complaint (just describe the waste and street address)\n• Safe segregation and disposal guidelines for organic, plastic, e-waste, hazardous, or medical waste.',
      modelUsed: 'instant-predefined',
      fallbackUsed: false
    };
  }

  // 2. Instant complaint status / tracking lookup
  if (
    codeMatch ||
    /\b(check status|my complaints?|complaint status|status of my|track my|where is my (truck|vehicle|auto|crew)|progress of my)\b/i.test(q)
  ) {
    return {
      intent: 'check_status',
      complaintCode: codeMatch ? codeMatch[0].toUpperCase() : null,
      complaintDraft: null,
      reply:
        userComplaints.length > 0
          ? 'Here is the latest real-time status of your complaints:'
          : 'You do not have any complaints filed yet. Share the waste issue and street address here whenever you want to file one.',
      modelUsed: 'instant-predefined',
      fallbackUsed: false
    };
  }

  // 3. Instant structured complaint filing (when clear report verb + street address are present)
  const hasReportVerb = /\b(report|submit|file|log|register)\b/i.test(q);
  const addrMatch = trimmed.match(/(?:at|near|on|outside|opposite)\s+([^,.!?;\n]{3,90})/i);
  const weightMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const extractedAddress = addrMatch
    ? addrMatch[1].replace(/,?\s*around\s*\d+.*$/i, '').trim()
    : q.includes('my address') && userAddress
    ? userAddress
    : '';

  if (hasReportVerb && extractedAddress.length >= 3 && trimmed.length >= 12) {
    const cat = deterministicCategorize(trimmed);
    return {
      intent: 'submit_complaint',
      complaintCode: null,
      complaintDraft: {
        title: trimmed.replace(/^(report|submit|file|log|register)\s+/i, '').slice(0, 72),
        description: trimmed,
        wasteCategory: cat.suggestedCategory,
        address: extractedAddress,
        estimatedWeightKg: weightMatch ? Math.max(1, Math.round(Number(weightMatch[1]))) : 50,
        readyToSubmit: true
      },
      reply: `Filing your ${cat.suggestedCategory} waste complaint at ${extractedAddress}.`,
      modelUsed: 'instant-predefined',
      fallbackUsed: false
    };
  }

  // 4. Instant predefined disposal & municipal FAQ answers
  const predefinedFaqs = [
    {
      test: /\b(hazard|hazardous|batter(y|ies)|chemical|paint|acid|toxic|pesticide|solvent)\b/i,
      reply:
        'Hazardous Waste Disposal Guidelines:\n• Never place batteries, chemicals, paints, or toxic liquids in regular wet/dry bins or storm drains.\n• Seal items tightly in a leak-proof labeled container and store away from heat.\n• Submit a complaint under the "Hazardous" category (or tell me the address right here) so our specialized Hazmat Van is dispatched immediately.'
    },
    {
      test: /\b(medical|syringe|needle|biohazard|bandage|expired medicine|clinical)\b/i,
      reply:
        'Biomedical & Medical Waste Guidelines:\n• Place sharps (needles/syringes) inside a rigid puncture-proof container.\n• Keep bandages and expired medicines sealed in a separate red/yellow marked bag away from household trash.\n• File a complaint under the "Medical" category for priority Hazmat pickup.'
    },
    {
      test: /\b(e-?waste|electronic|old (phone|laptop|charger|tv|monitor|computer)|circuit)\b/i,
      reply:
        'Electronic (E-Waste) Disposal Guidelines:\n• Keep electronics dry and avoid breaking screens or batteries (they contain heavy metals).\n• Wipe personal data from phones/laptops before handover.\n• File an "Electronic" waste complaint with your address to schedule certified e-waste collection.'
    },
    {
      test: /\b(organic|wet waste|kitchen waste|food waste|compost|garden leaves)\b/i,
      reply:
        'Organic / Wet Waste Guidelines:\n• Use the Green Bin for fruit/vegetable peels, cooked leftovers, tea leaves, and garden clippings.\n• Drain excess liquid before bagging and avoid mixing plastic wrappers with wet waste.\n• Door-to-door wet waste pickup runs daily in the morning shift, or report overflows directly here.'
    },
    {
      test: /\b(plastic|recycl|dry waste|cardboard|glass bottle|paper|metal scrap)\b/i,
      reply:
        'Dry & Recyclable Waste Guidelines:\n• Rinse and dry plastic bottles, cans, glass, and food containers before placing them in the Blue Bin.\n• Flatten cardboard boxes and bundle newspapers separately so they stay dry.\n• Large accumulations can be reported under "Plastic" or "Recyclable" for Tipper/Compactor pickup.'
    },
    {
      test: /\b(construction|debris|rubble|concrete|bricks|demolition|renovation)\b/i,
      reply:
        'Construction & Demolition Debris Guidelines:\n• Do not mix bricks, cement, tiles, or rubble with household bins — it damages compactor hydraulics.\n• Stack debris neatly without blocking roads or drains.\n• Report it under "Construction" with an estimated weight so a heavy Tipper Truck is dispatched.'
    },
    {
      test: /\b(waste categor|types of waste|what categories|list categories)\b/i,
      reply:
        'CivicClean tracks 9 official waste categories:\n1. Organic (wet/food/garden)\n2. Recyclable (paper/cardboard/glass/metal)\n3. Plastic (bottles/packaging)\n4. Electronic (e-waste/appliances)\n5. Hazardous (batteries/chemicals/paint)\n6. Construction (rubble/concrete/debris)\n7. Medical (syringes/clinical waste)\n8. Mixed municipal waste\n9. Other'
    },
    {
      test: /\b(how (do i|to) (submit|file|report|lodge)|how to complain)\b/i,
      reply:
        'You can submit a complaint in two quick ways:\n1. Right here in chat — type the waste issue and street address (e.g., "Report overflowing organic waste at 14 MG Road, around 80kg").\n2. Open "Submit Complaint" in the sidebar, enter details, pin the exact GPS spot on the map, and submit.'
    },
    {
      test: /\b(how does (live )?tracking|how to track|email alert|push alert|notification)\b/i,
      reply:
        'Live Tracking & Alerts:\n• Once an admin dispatches a crew, open "My Complaints" to watch the assigned vehicle (truck, auto, tipper, or hazmat van) move live on the map with real-time ETA and distance.\n• You receive automatic in-app, browser push, and email alerts when a crew is assigned, en route, approaching (<450m), arrived, and resolved.'
    },
    {
      test: /\b(pickup time|collection timing|collection schedule|when does the truck come)\b/i,
      reply:
        'Municipal Collection Shifts:\n• Morning Shift: 6:30 AM – 11:30 AM (daily wet/organic & household rounds)\n• Afternoon Shift: 1:00 PM – 5:30 PM (dry recyclables, commercial corridors & dispatched complaints)\n• Night Shift: 8:00 PM – 12:00 AM (bulk market & high-density compactor sweeps).'
    }
  ];

  // Only short-circuit FAQs when the user is asking a general/disposal question (not reporting a specific incident)
  if (!hasReportVerb) {
    for (const faq of predefinedFaqs) {
      if (faq.test.test(q)) {
        return {
          intent: 'general_help',
          complaintCode: null,
          complaintDraft: null,
          reply: faq.reply,
          modelUsed: 'instant-predefined',
          fallbackUsed: false
        };
      }
    }
  }

  return null;
}

export async function chatWithCitizen({
  message,
  history = [],
  userComplaints = [],
  userAddress = ''
}) {
  // Fast-path: check predefined intents & FAQs first (<2ms)
  const predefined = matchPredefinedCitizenIntent(message, userComplaints, userAddress);
  if (predefined) {
    return predefined;
  }

  // Otherwise route open-ended / complex requests to the LLM
  const client = getGeminiClient();
  if (!client) {
    return buildCitizenChatFallback(message, userComplaints, userAddress);
  }

  try {
    const recent = history
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 220)}`)
      .join('\n');

    const complaintsContext =
      userComplaints.length > 0
        ? userComplaints
            .slice(0, 5)
            .map(
              (c) =>
                `- ${c.complaintCode}: "${c.title}" | ${c.status} | ${c.priority} | ${c.wasteCategory} | ${c.address}${
                  c.assignedTaskId?.assignedVehicleId?.registrationNumber
                    ? ` | vehicle=${c.assignedTaskId.assignedVehicleId.registrationNumber}`
                    : ''
                }`
            )
            .join('\n')
        : 'None.';

    const prompt = `You are CivicClean Assistant, a fast municipal waste-management helper. Never mention AI model names or vendors.
Return STRICT JSON:
{"intent":"check_status"|"submit_complaint"|"general_help","reply":"concise helpful answer","complaintCode":"SWM-..."|null,"complaintDraft":{"title":"short","description":">=10 chars","wasteCategory":one of ${JSON.stringify(WASTE_CATEGORIES)},"address":"street","landmark":null,"estimatedWeightKg":50,"readyToSubmit":boolean}|null}

Rules:
- Status/tracking query -> intent="check_status" using ONLY Verified Complaints below.
- File/report waste -> intent="submit_complaint"; readyToSubmit=true ONLY if both waste description (>=10 chars) and street address (>=3 chars) are known (use Profile Address only if user says "my address"); otherwise ask briefly for missing info.
- Any other question -> intent="general_help", answer concisely and accurately.

Profile Address: ${userAddress || 'None'}
Verified Complaints:
${complaintsContext}
${recent ? `History:\n${recent}\n` : ''}Message: ${message}`;

    const resp = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: buildFastJsonConfig(320)
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), getGeminiTimeoutMs()))
    ]);

    const parsed = chatIntentSchema.parse(JSON.parse(resp.text || '{}'));
    return {
      ...parsed,
      modelUsed: 'smart-assistant',
      fallbackUsed: false
    };
  } catch (err) {
    console.warn('[AI chat fallback]', err?.message || err);
    return buildCitizenChatFallback(message, userComplaints, userAddress);
  }
}

function buildCitizenChatFallback(message, userComplaints = [], userAddress = '') {
  const q = message.toLowerCase();
  const codeMatch = message.match(/SWM-\d{4}-[A-Z0-9]+/i);

  if (
    codeMatch ||
    q.includes('status') ||
    q.includes('track') ||
    q.includes('my complaint') ||
    q.includes('progress') ||
    q.includes('update')
  ) {
    return {
      intent: 'check_status',
      complaintCode: codeMatch ? codeMatch[0].toUpperCase() : null,
      complaintDraft: null,
      reply:
        userComplaints.length > 0
          ? 'Here is the latest status of your complaints from our database.'
          : 'You currently have no complaints on record.',
      modelUsed: 'instant-predefined',
      fallbackUsed: true
    };
  }

  if (
    q.includes('report') ||
    q.includes('submit') ||
    q.includes('file') ||
    q.includes('complain') ||
    q.includes('dump') ||
    q.includes('overflow') ||
    q.includes('garbage') ||
    q.includes('waste at') ||
    q.includes('waste near')
  ) {
    const cat = deterministicCategorize(message);
    const addrMatch = message.match(/(?:at|near|on|outside|opposite)\s+([^,.!?;\n]{3,90})/i);
    const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const address = addrMatch ? addrMatch[1].trim() : q.includes('my address') ? userAddress : '';
    const readyToSubmit = Boolean(address && message.trim().length >= 10);

    return {
      intent: 'submit_complaint',
      complaintCode: null,
      complaintDraft: {
        title: message.trim().slice(0, 72),
        description: message.trim(),
        wasteCategory: cat.suggestedCategory,
        address: address || undefined,
        estimatedWeightKg: weightMatch ? Math.max(1, Math.round(Number(weightMatch[1]))) : 50,
        readyToSubmit
      },
      reply: readyToSubmit
        ? `Submitting your ${cat.suggestedCategory} waste complaint at ${address}.`
        : 'I can file that complaint for you right here — please include the street address or landmark (for example: "Report overflowing plastic waste at 14 MG Road").',
      modelUsed: 'instant-predefined',
      fallbackUsed: true
    };
  }

  return {
    intent: 'general_help',
    complaintCode: null,
    complaintDraft: null,
    reply:
      'I can check your complaint status, file a new waste complaint directly from chat, or answer waste disposal questions.',
    modelUsed: 'instant-predefined',
    fallbackUsed: true
  };
}
