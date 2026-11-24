import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { WASTE_CATEGORIES } from '../config/constants.js';

const categorizationSchema = z.object({
  suggestedCategory: z.enum(WASTE_CATEGORIES),
  confidence: z.number().min(0).max(1),
  issueType: z.string().min(2).max(120),
  summary: z.string().min(5).max(300),
  keywords: z.array(z.string()).max(8)
});

const duplicateCompareSchema = z.object({
  likelySameIncident: z.boolean(),
  contextualSimilarity: z.number().min(0).max(1),
  reason: z.string().min(3).max(240)
});

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
  const keywords = matchedKeywords.length > 0 ? matchedKeywords.slice(0, 5) : text.split(/\W+/).filter((w) => w.length > 4).slice(0, 4);

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
  if (!client) {
    return deterministicCategorize(`${title} ${description}`);
  }

  try {
    const prompt = `You are a municipal waste classification engine. Analyze the citizen complaint and respond strictly in JSON matching this schema:
{
  "suggestedCategory": one of ${JSON.stringify(WASTE_CATEGORIES)},
  "confidence": number between 0 and 1,
  "issueType": short phrase describing nature of issue,
  "summary": concise 1-sentence summary,
  "keywords": array of up to 6 key terms
}
Complaint Title: ${title}
Complaint Description: ${description}`;

    const response = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), getGeminiTimeoutMs()))
    ]);

    const parsedJson = JSON.parse(response.text || '{}');
    const validated = categorizationSchema.parse(parsedJson);
    return {
      ...validated,
      modelUsed: getModelName(),
      fallbackUsed: false
    };
  } catch (err) {
    console.warn('[Gemini categorize fallback]', err?.message || err);
    return deterministicCategorize(`${title} ${description}`);
  }
}

export async function compareDuplicateContext(newText, existingText) {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const prompt = `Compare these two municipal waste complaints to assess if they describe the same physical waste incident. Return strict JSON:
{"likelySameIncident": boolean, "contextualSimilarity": number 0..1, "reason": short explanation}
New Complaint: ${newText}
Existing Complaint: ${existingText}`;

    const response = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 5000))
    ]);

    const parsed = duplicateCompareSchema.parse(JSON.parse(response.text || '{}'));
    return parsed;
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

export async function chatWithCitizen({
  message,
  history = [],
  userComplaints = [],
  userAddress = ''
}) {
  const client = getGeminiClient();
  if (!client) {
    return buildCitizenChatFallback(message, userComplaints, userAddress);
  }

  try {
    const recentHistory = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Citizen' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const complaintsContext =
      userComplaints.length > 0
        ? userComplaints
            .map(
              (c) =>
                `- ${c.complaintCode}: "${c.title}" | status=${c.status} | priority=${c.priority} | category=${c.wasteCategory} | address="${c.address}"`
            )
            .join('\n')
        : 'None on record.';

    const prompt = `You are CivicClean Assistant, an action-capable municipal waste-management AI assistant.
Understand what the citizen wants and return STRICT JSON matching:
{
  "intent": "check_status" | "submit_complaint" | "general_help",
  "reply": "clear, helpful response to the citizen",
  "complaintCode": "SWM-..." or null,
  "complaintDraft": {
    "title": "short complaint title",
    "description": "full waste issue description (>=10 chars)",
    "wasteCategory": one of ${JSON.stringify(WASTE_CATEGORIES)},
    "address": "street/location address",
    "landmark": "optional landmark",
    "estimatedWeightKg": number (default 50),
    "readyToSubmit": boolean
  } or null
}

Rules:
1. If the citizen asks about complaint status/progress/tracking (or mentions an SWM-* code), set intent="check_status" and answer using ONLY the Verified Citizen Complaints below.
2. If the citizen wants to report/file/submit a waste complaint, set intent="submit_complaint", extract fields, and set readyToSubmit=true ONLY when BOTH description (>=10 chars) and address (>=3 chars) are present. Otherwise set readyToSubmit=false and ask for the missing details.
3. For general waste disposal or category questions, set intent="general_help".

Citizen Profile Address: ${userAddress || 'Not provided'}
Verified Citizen Complaints:
${complaintsContext}

${recentHistory ? `Conversation History:\n${recentHistory}\n` : ''}Citizen Message: ${message}`;

    const response = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), getGeminiTimeoutMs()))
    ]);

    const parsed = chatIntentSchema.parse(JSON.parse(response.text || '{}'));
    return { ...parsed, modelUsed: getModelName(), fallbackUsed: false };
  } catch (err) {
    console.warn('[Gemini chat fallback]', err?.message || err);
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
      modelUsed: 'deterministic-fallback',
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
      modelUsed: 'deterministic-fallback',
      fallbackUsed: true
    };
  }

  let reply =
    'I can check your complaint status, file a new waste complaint directly from chat, or answer waste disposal questions.';
  if (q.includes('categor') || q.includes('type')) {
    reply =
      'Our municipality tracks 9 waste categories: Organic, Recyclable, Plastic, Electronic, Hazardous, Construction debris, Medical, Mixed, and Other.';
  } else if (q.includes('hazard') || q.includes('battery') || q.includes('chemical') || q.includes('medical')) {
    reply =
      'Never place hazardous, chemical, or medical waste in regular bins. Seal it safely, keep it away from drains, and report it under "hazardous" or "medical".';
  }

  return {
    intent: 'general_help',
    complaintCode: null,
    complaintDraft: null,
    reply,
    modelUsed: 'deterministic-fallback',
    fallbackUsed: true
  };
}
