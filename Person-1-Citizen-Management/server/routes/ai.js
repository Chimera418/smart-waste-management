import express from 'express';
import { z } from 'zod';
import { Complaint } from '../shared/models/Complaint.js';
import { ChatMessage } from '../shared/models/ChatMessage.js';
import { authenticate } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { categorizeWasteComplaint, chatWithCitizen } from '../shared/services/geminiService.js';
import { createComplaintRecord } from '../shared/services/complaintService.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const categorizeSchema = z.object({
  title: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().min(5).max(3000)
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000)
      })
    )
    .optional()
    .default([])
});

router.post(
  '/categorize',
  authenticate,
  validateBody(categorizeSchema),
  asyncHandler(async (req, res) => {
    const result = await categorizeWasteComplaint(req.body);
    return sendSuccess(res, { data: result });
  })
);

router.get(
  '/chat/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const messages = await ChatMessage.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(100);
    return sendSuccess(res, { data: messages });
  })
);

router.delete(
  '/chat/history',
  authenticate,
  asyncHandler(async (req, res) => {
    await ChatMessage.deleteMany({ userId: req.user._id });
    return sendSuccess(res, { message: 'Chat history cleared', data: { cleared: true } });
  })
);

router.post(
  '/chat',
  authenticate,
  validateBody(chatSchema),
  asyncHandler(async (req, res) => {
    let history = req.body.history || [];
    if (history.length === 0) {
      const recent = await ChatMessage.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
      history = recent.reverse().map((m) => ({ role: m.role, content: m.content }));
    }

    const complaintFilter = req.user.role === 'citizen' ? { citizenId: req.user._id } : {};
    const userComplaints = await Complaint.find(complaintFilter)
      .select('complaintCode title status priority wasteCategory address createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const aiDecision = await chatWithCitizen({
      message: req.body.message,
      history,
      userComplaints,
      userAddress: req.user.address || ''
    });

    let finalReply = aiDecision.reply;
    let actionType = 'none';
    let actionData = null;

    if (aiDecision.intent === 'check_status') {
      actionType = 'status_lookup';
      const code = aiDecision.complaintCode?.toUpperCase();
      const matched = code
        ? userComplaints.filter((c) => c.complaintCode.toUpperCase() === code)
        : userComplaints.slice(0, 5);

      actionData = {
        complaints: matched.map((c) => ({
          _id: c._id,
          complaintCode: c.complaintCode,
          title: c.title,
          status: c.status,
          priority: c.priority,
          wasteCategory: c.wasteCategory,
          address: c.address
        }))
      };

      if (matched.length === 0) {
        finalReply = code
          ? `I could not find complaint ${code} on your account.`
          : 'You do not have any complaints filed yet. You can describe the waste issue and address right here to submit one!';
      } else {
        const lines = matched.map(
          (c) =>
            `• ${c.complaintCode} (${c.title}): status is ${c.status.replace(/_/g, ' ').toUpperCase()}, priority ${c.priority.toUpperCase()} at ${c.address}.`
        );
        finalReply = `${aiDecision.reply}\n\n${lines.join('\n')}`;
      }
    } else if (
      aiDecision.intent === 'submit_complaint' &&
      aiDecision.complaintDraft?.readyToSubmit &&
      ['citizen', 'admin'].includes(req.user.role)
    ) {
      const draft = aiDecision.complaintDraft;
      const desc = (draft.description || req.body.message).trim();
      const addr = (draft.address || req.user.address || '').trim();

      if (desc.length >= 10 && addr.length >= 3) {
        const created = await createComplaintRecord({
          user: req.user,
          payload: {
            title: (draft.title || desc.slice(0, 72)).trim(),
            description: desc,
            wasteCategory: draft.wasteCategory,
            address: addr,
            landmark: draft.landmark || '',
            estimatedWeightKg: draft.estimatedWeightKg || 50,
            coordinates: req.body.coordinates || [77.5946, 12.9716]
          },
          source: 'chatbot'
        });

        actionType = 'complaint_created';
        actionData = {
          complaint: {
            _id: created._id,
            complaintCode: created.complaintCode,
            title: created.title,
            wasteCategory: created.wasteCategory,
            priority: created.priority,
            status: created.status,
            address: created.address
          }
        };
        finalReply = `Complaint ${created.complaintCode} has been submitted!\n• Category: ${created.wasteCategory}\n• Priority: ${created.priority.toUpperCase()}\n• Address: ${created.address}\n\nYou can track it live under My Complaints.`;
      }
    }

    const [userMessage, assistantMessage] = await ChatMessage.create([
      { userId: req.user._id, role: 'user', content: req.body.message },
      {
        userId: req.user._id,
        role: 'assistant',
        content: finalReply,
        modelUsed: aiDecision.modelUsed,
        fallbackUsed: aiDecision.fallbackUsed,
        actionType,
        actionData
      }
    ]);

    return sendSuccess(res, {
      data: {
        reply: finalReply,
        intent: aiDecision.intent,
        actionType,
        actionData,
        modelUsed: aiDecision.modelUsed,
        fallbackUsed: aiDecision.fallbackUsed,
        userMessage,
        assistantMessage
      }
    });
  })
);

export default router;
