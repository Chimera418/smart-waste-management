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

export async function chatWithCitizen({ message, history = [] }) {
  const client = getGeminiClient();
  if (!client) {
    return buildCitizenChatFallback(message);
  }

  try {
    const recentHistory = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Citizen' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are CivicClean Assistant, a helpful municipal waste-management chatbot for citizens.
Capabilities:
- Explain waste categories: organic, recyclable, plastic, electronic, hazardous, construction, medical, mixed, other.
- Guide citizens through filing a text-based complaint (description, AI category check, GPS/map pin, address).
- Give safe disposal advice (especially keeping hazardous/medical/e-waste separate from household bins).
Keep responses concise, friendly, and practical.

${recentHistory ? `Conversation so far:\n${recentHistory}\n` : ''}Citizen: ${message}
Assistant:`;

    const response = await Promise.race([
      client.models.generateContent({
        model: getModelName(),
        contents: prompt
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), getGeminiTimeoutMs()))
    ]);

    const reply = (response.text || '').trim();
    if (!reply) throw new Error('Empty Gemini response');
    return { reply, modelUsed: getModelName(), fallbackUsed: false };
  } catch (err) {
    console.warn('[Gemini chat fallback]', err?.message || err);
    return buildCitizenChatFallback(message);
  }
}

function buildCitizenChatFallback(message) {
  const q = message.toLowerCase();
  let reply =
    'I can help you categorize waste, follow safe disposal rules, or file a municipal complaint. Go to "Submit Complaint", describe the issue in plain text, click "AI Categorize", and pin the spot on the map.';

  if (q.includes('categor') || q.includes('type')) {
    reply =
      'Our municipality tracks 9 waste categories: Organic (food/garden), Recyclable (paper/glass/metal), Plastic, Electronic (e-waste), Hazardous (chemicals/batteries/paint), Construction debris, Medical (sharps/clinic waste), Mixed, and Other.';
  } else if (q.includes('hazard') || q.includes('battery') || q.includes('chemical') || q.includes('medical')) {
    reply =
      'Never place hazardous, chemical, or medical waste in regular bins. Seal it safely, keep it away from drains, and submit a complaint with category "hazardous" or "medical" so a specialized van is dispatched.';
  } else if (q.includes('submit') || q.includes('report') || q.includes('complaint') || q.includes('track')) {
    reply =
      'To report an issue: 1) Open "Submit Complaint", 2) Write a clear description with landmarks, 3) Click "AI Suggest Category" and verify it, 4) Click the map or "Use My GPS", and 5) Submit. Track progress anytime under "My Complaints".';
  } else if (q.includes('e-waste') || q.includes('electronic') || q.includes('laptop') || q.includes('phone')) {
    reply =
      'Electronic waste (phones, batteries, cables, appliances) contains recoverable metals and toxic components. Select the "electronic" category for dedicated municipal e-waste pickup.';
  }

  return { reply, modelUsed: 'deterministic-fallback', fallbackUsed: true };
}
