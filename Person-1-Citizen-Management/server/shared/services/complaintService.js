import { Complaint } from '../models/Complaint.js';
import { CollectionZone } from '../models/CollectionZone.js';
import { Notification } from '../models/Notification.js';
import { categorizeWasteComplaint } from './geminiService.js';
import { detectPotentialDuplicates } from './duplicateService.js';
import { generateCode } from '../utils/response.js';

export async function createComplaintRecord({ user, payload, source = 'portal' }) {
  const {
    title,
    description,
    coordinates = [77.5946, 12.9716],
    address,
    landmark = '',
    estimatedWeightKg = 50
  } = payload;

  const aiCat = payload.aiSuggestedCategory
    ? {
        suggestedCategory: payload.aiSuggestedCategory,
        confidence: payload.aiConfidence ?? 0.8,
        issueType: payload.aiIssueType || 'Citizen-Verified Waste Issue',
        summary: payload.aiSummary || description.slice(0, 180),
        keywords: payload.aiKeywords || [],
        modelUsed: payload.aiModelUsed || 'gemini-3-flash-preview',
        fallbackUsed: Boolean(payload.aiFallbackUsed)
      }
    : await categorizeWasteComplaint({ title, description });

  const finalCategory = payload.wasteCategory || aiCat.suggestedCategory;
  const duplicateAnalysis = await detectPotentialDuplicates({
    title,
    description,
    coordinates,
    wasteCategory: finalCategory,
    useAiContext: true
  });

  const matchedZone = await CollectionZone.findOne({
    isActive: true,
    boundary: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates }
      }
    }
  }).select('_id name code');

  const defaultHours = finalCategory === 'hazardous' || finalCategory === 'medical' ? 12 : 48;
  const slaDeadline = new Date(Date.now() + defaultHours * 3600 * 1000);

  const complaint = await Complaint.create({
    complaintCode: generateCode('SWM'),
    citizenId: user._id,
    title,
    description,
    wasteCategory: finalCategory,
    aiCategorization: {
      ...aiCat,
      userAccepted: finalCategory === aiCat.suggestedCategory
    },
    priority: finalCategory === 'hazardous' || finalCategory === 'medical' ? 'high' : 'medium',
    estimatedWeightKg,
    location: { type: 'Point', coordinates },
    address,
    landmark,
    zoneId: matchedZone?._id,
    status: 'submitted',
    statusHistory: [
      {
        status: 'submitted',
        note: duplicateAnalysis.isPotentialDuplicate
          ? `Complaint registered via ${source} with potential nearby duplicate flagged for review.`
          : `Complaint submitted by citizen via ${source}.`,
        changedBy: user._id
      }
    ],
    duplicateAnalysis,
    slaDeadline
  });

  await Notification.create({
    recipientId: user._id,
    recipientRole: user.role,
    type: 'complaint_submitted',
    title: `Complaint ${complaint.complaintCode} Registered`,
    message: `Your ${finalCategory} waste complaint at ${address} has been logged and queued for triage.`,
    relatedEntityType: 'complaint',
    relatedEntityId: complaint._id
  });

  return complaint;
}
