import express from 'express';
import { Notification } from '../shared/models/Notification.js';
import { authenticate } from '../shared/middleware/auth.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ recipientId: req.user._id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ recipientId: req.user._id, isRead: false })
    ]);
    return sendSuccess(res, { data: { items, unreadCount } });
  })
);

router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipientId: req.user._id, isRead: false }, { isRead: true });
    return sendSuccess(res, { data: { updated: true } });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    return sendSuccess(res, { data: n });
  })
);

export default router;
