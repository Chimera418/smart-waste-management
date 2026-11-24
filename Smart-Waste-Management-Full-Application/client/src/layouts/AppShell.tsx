import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  BarChart3,
  Bell,
  BellRing,
  Bot,
  ClipboardCheck,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  Flame,
  HardHat,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  MapPin,
  Navigation,
  Recycle,
  ShieldCheck,
  Truck,
  UserCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';

interface ToastNotification {
  _id: string;
  title: string;
  message: string;
  emailSent?: boolean;
  emailMode?: 'resend' | 'smtp' | 'ethereal' | 'none';
  emailRecipient?: string;
  emailPreviewUrl?: string;
}

function triggerBrowserPush(n: ToastNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    new window.Notification(`CivicClean SWM · ${n.title}`, {
      body: n.message,
      tag: n._id
    });
  } catch {
    // Ignore restricted browser contexts
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'denied'
  );
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await window.Notification.requestPermission();
    setPushPerm(perm);
    if (perm === 'granted') {
      new window.Notification('CivicClean SWM Alerts Enabled', {
        body: 'You will receive real-time vehicle approach and complaint status push alerts.'
      });
    }
  };

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const items: any[] = res.data.data.items || [];
      setUnread(res.data.data.unreadCount || 0);

      if (!initializedRef.current) {
        items.forEach((n) => seenIdsRef.current.add(n._id));
        initializedRef.current = true;
        return;
      }

      const freshUnread = items.filter((n) => !n.isRead && !seenIdsRef.current.has(n._id));
      if (freshUnread.length > 0) {
        freshUnread.forEach((n) => {
          seenIdsRef.current.add(n._id);
          triggerBrowserPush(n);
        });
        setToasts((prev) => [...freshUnread.slice(0, 3), ...prev].slice(0, 3));
      }
    } catch {
      // Ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    initializedRef.current = false;
    seenIdsRef.current = new Set();
    setToasts([]);
    loadUnread();
  }, [loadUnread, user?._id]);

  usePolling(loadUnread, 3000, Boolean(user));

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 9000);
    return () => clearTimeout(id);
  }, [toasts]);

  const role = user?.role;
  const navItems = [
    ...(role === 'citizen'
      ? [
          { to: '/citizen', label: 'Citizen Dashboard', icon: LayoutDashboard },
          { to: '/complaints/new', label: 'Submit Complaint', icon: FilePlus2 },
          { to: '/complaints', label: 'My Complaints', icon: History },
          { to: '/chatbot', label: 'Waste Assistant', icon: Bot }
        ]
      : []),
    ...(role === 'worker'
      ? [{ to: '/worker', label: 'Worker Console', icon: HardHat }]
      : []),
    ...(role === 'vehicle_operator'
      ? [
          { to: '/operator', label: 'Operator GPS Console', icon: Navigation },
          { to: '/tracking', label: 'Live Fleet Map', icon: Map }
        ]
      : []),
    ...(role === 'admin'
      ? [
          { to: '/admin', label: 'Command Center', icon: LayoutDashboard },
          { to: '/admin/dispatch', label: 'Complaints & Dispatch', icon: ClipboardCheck },
          { to: '/fleet', label: 'Workers & Fleet', icon: Truck },
          { to: '/zones', label: 'Collection Zones', icon: MapPin },
          { to: '/tracking', label: 'Live GPS Map', icon: Map },
          { to: '/analytics', label: 'Analytics Dashboard', icon: BarChart3 },
          { to: '/hotspots', label: 'Geospatial Hotspots', icon: Flame },
          { to: '/escalations', label: 'Escalations & SLA', icon: AlertOctagon },
          { to: '/audit', label: 'Security & Audit', icon: ShieldCheck },
          { to: '/reports', label: 'Users & Reports', icon: FileSpreadsheet }
        ]
      : []),
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    { to: '/profile', label: 'Profile', icon: UserCircle2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="flex flex-col bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-900/40">
            <Recycle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">CivicClean SWM</p>
            <p className="text-xs text-slate-400">Integrated Municipal Platform</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-wrap gap-1 p-3 lg:flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 space-y-2.5">
          {typeof window !== 'undefined' && 'Notification' in window && pushPerm !== 'granted' && (
            <button
              onClick={requestPushPermission}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600/20 px-3 py-2 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/40 hover:bg-teal-600/30"
            >
              <BellRing className="h-3.5 w-3.5" />
              Enable Push Alerts
            </button>
          )}
          <div>
            <p className="text-xs font-semibold text-white">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2.5">
          {toasts.map((t) => (
            <div
              key={t._id}
              className="rounded-xl border border-teal-200 bg-white/95 p-3.5 shadow-xl ring-1 ring-slate-900/10 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                  <BellRing className="h-3.5 w-3.5 animate-pulse text-teal-600" />
                  <span>{t.title}</span>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item._id !== t._id))}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">{t.message}</p>
              {(t.emailSent || t.emailPreviewUrl) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  {t.emailSent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      <Mail className="h-3 w-3" />
                      {t.emailMode === 'resend' || t.emailMode === 'smtp'
                        ? `Emailed ${t.emailRecipient || 'Inbox'}`
                        : 'Email Preview Ready'}
                    </span>
                  )}
                  {t.emailPreviewUrl && (
                    <a
                      href={t.emailPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
                    >
                      Open Email <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
