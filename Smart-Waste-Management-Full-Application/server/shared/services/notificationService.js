import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

let cachedTransporter = null;
let cachedMode = null;
let cachedConfigKey = '';

function readResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || '';
  const fromAddress =
    process.env.RESEND_FROM?.trim() || 'CivicClean SWM <onboarding@resend.dev>';
  return { apiKey, fromAddress, configured: Boolean(apiKey) };
}

function readSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || '';
  const port = Number(process.env.SMTP_PORT || (host.includes('gmail') ? 465 : 587));
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';
  const configured = Boolean(host && user && pass);
  const rawFrom = process.env.SMTP_FROM?.trim();
  const fromAddress = configured
    ? rawFrom && !rawFrom.endsWith('.local')
      ? rawFrom
      : `"CivicClean SWM Alerts" <${user}>`
    : rawFrom || '"CivicClean SWM Alerts" <alerts@civicclean.local>';

  return { host, port, user, pass, configured, fromAddress };
}

export function getEmailServiceStatus() {
  const resend = readResendConfig();
  if (resend.configured) {
    return {
      configured: true,
      mode: 'resend',
      smtpHost: 'api.resend.com (Resend API)',
      smtpPort: 443,
      senderEmail: resend.fromAddress,
      fromAddress: resend.fromAddress
    };
  }

  const cfg = readSmtpConfig();
  if (cfg.configured) {
    return {
      configured: true,
      mode: 'smtp',
      smtpHost: cfg.host,
      smtpPort: cfg.port,
      senderEmail: cfg.user,
      fromAddress: cfg.fromAddress
    };
  }

  return {
    configured: false,
    mode: 'ethereal',
    smtpHost: 'smtp.ethereal.email (preview sandbox)',
    smtpPort: 587,
    senderEmail: '',
    fromAddress: cfg.fromAddress
  };
}

async function sendViaResend({ to, subject, text, html }) {
  const { apiKey, fromAddress } = readResendConfig();
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      text,
      html
    })
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const errMsg = payload?.message || payload?.error?.message || `Resend HTTP ${resp.status}`;
    throw new Error(errMsg);
  }
  return payload;
}

async function getMailTransporter() {
  const cfg = readSmtpConfig();

  if (cfg.configured) {
    const configKey = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.pass.length}`;
    if (cachedMode !== 'smtp' || !cachedTransporter || cachedConfigKey !== configKey) {
      const isGmail = cfg.host.toLowerCase().includes('gmail.com');
      cachedTransporter = nodemailer.createTransport(
        isGmail
          ? {
              service: 'gmail',
              auth: { user: cfg.user, pass: cfg.pass }
            }
          : {
              host: cfg.host,
              port: cfg.port,
              secure: cfg.port === 465,
              auth: { user: cfg.user, pass: cfg.pass }
            }
      );
      cachedMode = 'smtp';
      cachedConfigKey = configKey;
    }
    return { transporter: cachedTransporter, mode: 'smtp', fromAddress: cfg.fromAddress };
  }

  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test' || process.env.DISABLE_ETHEREAL === 'true') {
    return null;
  }

  if (!cachedTransporter || cachedMode !== 'ethereal') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      cachedMode = 'ethereal';
      cachedConfigKey = 'ethereal';
    } catch (err) {
      console.warn('[Email Ethereal Setup Failed]', err?.message || err);
      return null;
    }
  }
  return { transporter: cachedTransporter, mode: 'ethereal', fromAddress: cfg.fromAddress };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlEmail({ title, message, type, recipientName = 'Citizen' }) {
  const badgeColor =
    type === 'escalation_alert'
      ? '#dc2626'
      : type === 'task_completed'
      ? '#059669'
      : type === 'task_updated'
      ? '#0284c7'
      : '#0f766e';

  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#ffffff;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#0f766e 100%);color:#ffffff;padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>
            <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em;">CivicClean SWM</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Municipal Smart Waste Operations Center</div>
          </td>
          <td align="right">
            <span style="display:inline-block;background:${badgeColor};color:#ffffff;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(String(type).replace(/_/g, ' '))}</span>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:24px;color:#1e293b;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Hello ${escapeHtml(recipientName)},</p>
      <h2 style="margin:0 0 12px;font-size:19px;line-height:1.3;color:#0f172a;">${escapeHtml(title)}</h2>
      <div style="background:#f8fafc;border-left:4px solid ${badgeColor};border-radius:6px;padding:14px 16px;margin:0 0 18px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(message)}</p>
      </div>
      <p style="margin:0 0 16px;font-size:12px;color:#64748b;">Dispatched at: <strong>${escapeHtml(timestamp)}</strong></p>
      <div style="border-top:1px solid #e2e8f0;padding-top:14px;font-size:11px;color:#94a3b8;">
        Real-time municipal notification from CivicClean Smart Waste Management System. Log into the portal to view live GPS vehicle tracking.
      </div>
    </div>
  </div>`;
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
  let emailMode = 'none';
  let emailRecipient = '';
  let emailPreviewUrl = '';
  let emailError = '';

  const isTestEnv = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

  if (sendEmail && !isTestEnv) {
    const user = await User.findById(recipientId).select('email name');
    if (user?.email) {
      emailRecipient = user.email;
      const subject = `[CivicClean SWM] ${title}`;
      const text = `${title}\n\n${message}\n\n— CivicClean Smart Waste Management`;
      const html = buildHtmlEmail({
        title,
        message,
        type,
        recipientName: user.name || 'User'
      });

      const resend = readResendConfig();
      if (resend.configured) {
        emailMode = 'resend';
        try {
          const result = await sendViaResend({ to: user.email, subject, text, html });
          emailSent = true;
          console.log(`[Email Resend Sent] To ${user.email}: id=${result.id}`);
        } catch (err) {
          emailError = err?.message || 'Resend delivery failed';
          console.warn(`[Email Resend Failed] To ${user.email}:`, emailError);
          emailSent = false;
        }
      } else {
        const mail = await getMailTransporter();
        if (mail) {
          emailMode = mail.mode;
          try {
            const info = await mail.transporter.sendMail({
              from: mail.fromAddress,
              to: user.email,
              subject,
              text,
              html
            });
            emailSent = true;
            if (mail.mode === 'ethereal') {
              emailPreviewUrl = nodemailer.getTestMessageUrl(info) || '';
              if (emailPreviewUrl) {
                console.log(`[Email Preview] To ${user.email}: ${emailPreviewUrl}`);
              }
            } else {
              console.log(`[Email SMTP Sent] To ${user.email}: ${info.messageId}`);
            }
          } catch (err) {
            emailError = err?.message || 'SMTP delivery failed';
            console.warn('[Email Dispatch Failed]', emailError);
            emailSent = false;
          }
        }
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
    emailSent,
    emailMode,
    emailRecipient,
    emailPreviewUrl,
    emailError
  });

  await pushFirebaseRealtimeSignal(notification);
  return notification;
}
