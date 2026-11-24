import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientRole: { type: String, default: 'worker' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntityType: { type: String, default: 'task' },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
