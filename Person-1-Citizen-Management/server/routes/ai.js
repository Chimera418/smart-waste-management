import express from 'express';
import { z } from 'zod';
import { ChatMessage } from '../shared/models/ChatMessage.js';
import { authenticate } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { categorizeWasteComplaint, chatWithCitizen } from '../shared/services/geminiService.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const categorizeSchema = z.object({
  title: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().min(5).max(3000)
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
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

    const result = await chatWithCitizen({ message: req.body.message, history });

    const [userMessage, assistantMessage] = await ChatMessage.create([
      { userId: req.user._id, role: 'user', content: req.body.message },
      {
        userId: req.user._id,
        role: 'assistant',
        content: result.reply,
        modelUsed: result.modelUsed,
        fallbackUsed: result.fallbackUsed
      }
    ]);

    return sendSuccess(res, {
      data: {
        ...result,
        userMessage,
        assistantMessage
      }
    });
  })
);

export default router;
