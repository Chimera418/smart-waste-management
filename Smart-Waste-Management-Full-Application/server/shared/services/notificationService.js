import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

function getMailTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass }
  });
}

async function pushFirebaseRealtimeSignal(notification) {
  const dbUrl = process.env.FIREBASE_DATABASE_URL?.trim();
  if (!dbUrl) return;
  try {
    await fetch(`${dbUrl.replace(/\/$/, '')}/notifications/${notification.recipientId}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        createdAt: notification.createdAt
      })
    });
  } catch {
    // Optional non-blocking push
  }
}

export async function dispatchNotification({
  recipientId,
  recipientRole = 'citizen',
  type,
  title,
  message,
  relatedEntityType = 'complaint',
  relatedEntityId = null,
  sendEmail = false
}) {
  let emailSent = false;
  if (sendEmail) {
    const transporter = getMailTransporter();
    if (transporter) {
      try {
        const user = await User.findById(recipientId).select('email');
        if (user?.email) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'alerts@civicclean.local',
            to: user.email,
            subject: `[CivicClean SWM] ${title}`,
            text: message
          });
          emailSent = true;
        }
      } catch {
        emailSent = false;
      }
    }
  }

  const notification = await Notification.create({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    emailSent
  });

  await pushFirebaseRealtimeSignal(notification);
  return notification;
}
