import express from 'express';
import { Notification } from '../shared/models/Notification.js';
import { authenticate } from '../shared/middleware/auth.js';
import { dispatchNotification, getEmailServiceStatus } from '../shared/services/notificationService.js';
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
    return sendSuccess(res, {
      data: {
        items,
        unreadCount,
        emailStatus: getEmailServiceStatus()
      }
    });
  })
);

router.post(
  '/test-email',
  authenticate,
  asyncHandler(async (req, res) => {
    const emailStatus = getEmailServiceStatus();
    const notification = await dispatchNotification({
      recipientId: req.user._id,
      recipientRole: req.user.role,
      type: 'system_alert',
      title: 'CivicClean Live Email & Push Alert Verification',
      message: `Hello ${req.user.name}, this is a live verification alert sent to ${req.user.email}. Real-time vehicle approach updates and complaint status alerts are active.`,
      relatedEntityType: 'system',
      sendEmail: true
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: notification.emailSent
        ? emailStatus.mode === 'resend' || emailStatus.mode === 'smtp'
          ? `Real email delivered to ${req.user.email} via ${emailStatus.mode === 'resend' ? 'Resend' : 'SMTP'}`
          : `Test email dispatched via Ethereal preview sandbox for ${req.user.email}`
        : notification.emailError || 'Notification logged (configure Resend or SMTP for real inbox delivery)',
      data: {
        notification,
        emailStatus
      }
    });
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
