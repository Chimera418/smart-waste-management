import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, BellRing, CheckCheck, CheckCircle2, ExternalLink, Mail, Send } from 'lucide-react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../context/AuthContext';

interface EmailStatus {
  configured: boolean;
  mode: 'resend' | 'smtp' | 'ethereal';
  smtpHost: string;
  senderEmail?: string;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; previewUrl?: string; ok: boolean } | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'denied'
  );

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data.items || []);
      if (res.data.data.emailStatus) {
        setEmailStatus(res.data.data.emailStatus);
      }
    } catch {
      // Ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, 4000, true);

  const enableBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await window.Notification.requestPermission();
    setPushPerm(perm);
    if (perm === 'granted') {
      new window.Notification('CivicClean SWM Push Alerts Active', {
        body: 'Desktop alerts will fire automatically when vehicles approach or complaints update.'
      });
    }
  };

  const sendTestAlert = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/notifications/test-email', {});
      const n = res.data.data.notification;
      setTestResult({
        text: res.data.message,
        previewUrl: n?.emailPreviewUrl || undefined,
        ok: Boolean(n?.emailSent)
      });
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(`CivicClean SWM · ${n.title}`, { body: n.message });
      }
      await load();
    } catch (err: any) {
      setTestResult({
        text: err?.response?.data?.message || 'Failed to send test alert',
        ok: false
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications, Push & Email Alerts</h1>
          <p className="text-sm text-slate-600">
            Real-time in-app alerts, native browser push notifications, and automated emails to{' '}
            <strong className="text-slate-800">{user?.email}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeof window !== 'undefined' && 'Notification' in window && (
            <button
              onClick={enableBrowserPush}
              disabled={pushPerm === 'granted'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                pushPerm === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              <BellRing className="h-3.5 w-3.5" />
              {pushPerm === 'granted' ? 'Browser Push Active' : 'Enable Browser Push'}
            </button>
          )}
          <button
            onClick={sendTestAlert}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {testing ? 'Sending...' : 'Send Test Email & Push'}
          </button>
          <button
            onClick={async () => {
              await api.patch('/notifications/read-all');
              load();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4 text-teal-600" /> Mark all read
          </button>
        </div>
      </div>

      {emailStatus && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            emailStatus.configured
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {emailStatus.configured ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {emailStatus.configured
                    ? `Real Email Delivery Active (${emailStatus.mode === 'resend' ? 'Resend API' : emailStatus.smtpHost} · From: ${emailStatus.senderEmail})`
                    : 'Email Sandbox Mode (Ethereal Preview) — Real Inbox Provider Not Configured Yet'}
                </p>
                {emailStatus.configured ? (
                  <p className="text-emerald-800">
                    All complaint updates, crew dispatches, and vehicle arrival milestones are being emailed directly to{' '}
                    <strong>{user?.email}</strong>.
                  </p>
                ) : (
                  <p className="text-amber-800">
                    Emails are currently captured in Ethereal preview links (click <strong>View Email</strong> below)
                    because <code className="rounded bg-amber-100 px-1 font-mono">SMTP_HOST</code> /{' '}
                    <code className="rounded bg-amber-100 px-1 font-mono">SMTP_USER</code> /{' '}
                    <code className="rounded bg-amber-100 px-1 font-mono">SMTP_PASS</code> are empty in{' '}
                    <code className="rounded bg-amber-100 px-1 font-mono">.env</code>. Add a free Gmail App Password to
                    deliver directly into <strong>{user?.email}</strong>!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            testResult.ok
              ? 'border-teal-200 bg-teal-50 text-teal-900'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{testResult.text}</span>
          {testResult.previewUrl && (
            <a
              href={testResult.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50"
            >
              Open Sent Email <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div key={n._id} className={`flex items-start justify-between gap-4 p-4 ${n.isRead ? '' : 'bg-teal-50/40'}`}>
              <div className="flex items-start gap-3">
                <Bell className={`mt-0.5 h-4 w-4 ${n.isRead ? 'text-slate-400' : 'text-teal-600'}`} />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {n.emailSent && (n.emailMode === 'resend' || n.emailMode === 'smtp') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        <Mail className="h-3 w-3" /> Delivered to {n.emailRecipient}
                      </span>
                    )}
                    {n.emailSent && n.emailMode !== 'resend' && n.emailMode !== 'smtp' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
                        <Mail className="h-3 w-3" /> Sandbox Preview ({n.emailRecipient || user?.email})
                      </span>
                    )}
                    {n.emailError && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                        Email Error: {n.emailError}
                      </span>
                    )}
                    {n.emailPreviewUrl && (
                      <a
                        href={n.emailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
                      >
                        View Email <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                  <p className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {!n.isRead && (
                <button
                  onClick={async () => {
                    await api.patch(`/notifications/${n._id}/read`);
                    load();
                  }}
                  className="shrink-0 rounded border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
