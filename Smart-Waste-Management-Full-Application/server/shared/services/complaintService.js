import { Complaint } from '../models/Complaint.js';
import { CollectionZone } from '../models/CollectionZone.js';
import { User } from '../models/User.js';
import { categorizeWasteComplaint, estimateComplaintPriority } from './geminiService.js';
import { detectPotentialDuplicates } from './duplicateService.js';
import { dispatchNotification } from './notificationService.js';
import { recordAudit } from './auditService.js';
import { generateCode } from '../utils/response.js';

export async function createComplaintRecord({ user, payload, req = null, source = 'portal' }) {
  const {
    title,
    description,
    coordinates = [77.5952, 12.9721],
    address,
    landmark = '',
    estimatedWeightKg = 50
  } = payload;

  const aiCat = payload.aiSuggestedCategory
    ? {
        suggestedCategory: payload.aiSuggestedCategory,
        confidence: payload.aiConfidence ?? 0.85,
        issueType: payload.aiIssueType || 'Citizen-Verified Waste Issue',
        summary: payload.aiSummary || description.slice(0, 180),
        keywords: payload.aiKeywords || [],
        modelUsed: payload.aiModelUsed || 'gemini-3-flash-preview',
        fallbackUsed: Boolean(payload.aiFallbackUsed)
      }
    : await categorizeWasteComplaint({ title, description });

  const finalCategory = payload.wasteCategory || aiCat.suggestedCategory;

  const [duplicateAnalysis, priorityEstimate, matchedZone] = await Promise.all([
    detectPotentialDuplicates({
      title,
      description,
      coordinates,
      wasteCategory: finalCategory,
      useAiContext: true
    }),
    estimateComplaintPriority({
      description,
      wasteCategory: finalCategory,
      coordinates,
      submittedAt: new Date()
    }),
    CollectionZone.findOne({
      isActive: true,
      boundary: { $geoIntersects: { $geometry: { type: 'Point', coordinates } } }
    }).select('_id name code')
  ]);

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
    priority: priorityEstimate.suggestedPriority,
    aiPriority: {
      suggestedPriority: priorityEstimate.suggestedPriority,
      score: priorityEstimate.score,
      reasoning: priorityEstimate.reasoning,
      ruleAdjustments: priorityEstimate.ruleAdjustments,
      overriddenByAdmin: false,
      modelUsed: priorityEstimate.modelUsed,
      fallbackUsed: priorityEstimate.fallbackUsed
    },
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
          ? `Submitted via ${source} with potential nearby duplicate flagged for triage.`
          : `Complaint registered via ${source} and auto-prioritized.`,
        changedBy: user._id
      }
    ],
    duplicateAnalysis,
    slaDeadline: priorityEstimate.slaDeadline
  });

  await dispatchNotification({
    recipientId: user._id,
    recipientRole: user.role,
    type: 'complaint_submitted',
    title: `Complaint ${complaint.complaintCode} Registered`,
    message: `Logged as ${finalCategory} (${complaint.priority.toUpperCase()} priority) at ${address}.`,
    relatedEntityType: 'complaint',
    relatedEntityId: complaint._id,
    sendEmail: true
  });

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      dispatchNotification({
        recipientId: a._id,
        recipientRole: 'admin',
        type: 'complaint_submitted',
        title: `New ${complaint.priority.toUpperCase()} Complaint (${complaint.complaintCode})`,
        message: `${title} at ${address}${matchedZone ? ` [${matchedZone.code}]` : ''}.`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaint._id
      })
    )
  );

  await recordAudit({
    actor: user,
    action: source === 'chatbot' ? 'COMPLAINT_SUBMITTED_CHATBOT' : 'COMPLAINT_SUBMITTED',
    resourceType: 'complaint',
    resourceId: complaint._id,
    req,
    metadata: {
      complaintCode: complaint.complaintCode,
      category: finalCategory,
      priority: complaint.priority,
      zoneCode: matchedZone?.code || null
    }
  });

  return complaint;
}
