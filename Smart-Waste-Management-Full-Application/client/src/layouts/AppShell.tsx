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

interface NavItem {
  to: string;
  label: string;
  icon: any;
  badge?: number;
  group?: string;
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
    // Ignore restricted contexts
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
        body: 'You will receive real-time vehicle approach and complaint status alerts.'
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
    }, 8000);
    return () => clearTimeout(id);
  }, [toasts]);

  const role = user?.role;
  const navItems: NavItem[] = [
    ...(role === 'citizen'
      ? [
          { to: '/citizen', label: 'Overview', icon: LayoutDashboard, group: 'Citizen Portal' },
          { to: '/complaints/new', label: 'Report Issue', icon: FilePlus2, group: 'Citizen Portal' },
          { to: '/complaints', label: 'My Reports & Map', icon: History, group: 'Citizen Portal' },
          { to: '/chatbot', label: 'Waste Assistant', icon: Bot, group: 'Citizen Portal' }
        ]
      : []),
    ...(role === 'worker'
      ? [{ to: '/worker', label: 'Field Assignments', icon: HardHat, group: 'Field Crew' }]
      : []),
    ...(role === 'vehicle_operator'
      ? [
          { to: '/operator', label: 'GPS Console', icon: Navigation, group: 'Fleet Unit' },
          { to: '/tracking', label: 'Live Fleet Map', icon: Map, group: 'Fleet Unit' }
        ]
      : []),
    ...(role === 'admin'
      ? [
          { to: '/admin', label: 'Command Center', icon: LayoutDashboard, group: 'Operations' },
          { to: '/admin/dispatch', label: 'Dispatch Queue', icon: ClipboardCheck, group: 'Operations' },
          { to: '/tracking', label: 'Live Fleet Map', icon: Map, group: 'Operations' },
          { to: '/fleet', label: 'Fleet & Crew', icon: Truck, group: 'Operations' },
          { to: '/zones', label: 'Ward Zones', icon: MapPin, group: 'Operations' },
          { to: '/analytics', label: 'Analytics', icon: BarChart3, group: 'Intelligence' },
          { to: '/hotspots', label: 'Hotspot Clusters', icon: Flame, group: 'Intelligence' },
          { to: '/escalations', label: 'SLA Escalations', icon: AlertOctagon, group: 'Intelligence' },
          { to: '/audit', label: 'Audit Trail', icon: ShieldCheck, group: 'Governance' },
          { to: '/reports', label: 'Users & Exports', icon: FileSpreadsheet, group: 'Governance' }
        ]
      : []),
    { to: '/notifications', label: 'Alerts & Email', icon: Bell, badge: unread, group: 'Account' },
    { to: '/profile', label: 'Profile', icon: UserCircle2, group: 'Account' }
  ];

  const groups = Array.from(new Set(navItems.map((n) => n.group)));
  const currentItem = navItems.find((n) => n.to === location.pathname);
  const initials = (user?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-[#F5F4EF] lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="flex flex-col border-r border-[#202723] bg-[#111513] text-[#E6E8E6]">
        {/* Architectural Brand Header */}
        <div className="flex items-center gap-3 border-b border-[#202723] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#14533C] text-[#A7F3D0] ring-1 ring-[#2B7A5B]/60">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
              <path d="M4 17V7l8-4 8 4v10l-8 4-8-4Z" />
              <path d="M12 3v18M4 7l8 4 8-4" opacity="0.65" />
            </svg>
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white">CivicClean</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A948E]">SWM · Bengaluru</p>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1.5 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7570]">
                {group}
              </p>
              <div className="flex flex-wrap gap-0.5 lg:flex-col">
                {navItems
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`relative flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium transition ${
                          active
                            ? 'bg-[#1B231F] text-white'
                            : 'text-[#A3ADA7] hover:bg-[#181E1B] hover:text-white'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#34D399]" />
                        )}
                        <span className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${active ? 'text-[#34D399]' : 'text-[#6F7B74]'}`} />
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded bg-[#B91C1C] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Account Strip */}
        <div className="border-t border-[#202723] p-4 space-y-3">
          {typeof window !== 'undefined' && 'Notification' in window && pushPerm !== 'granted' && (
            <button
              onClick={requestPushPermission}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#2B7A5B]/50 bg-[#14533C]/30 px-3 py-1.5 text-xs font-medium text-[#A7F3D0] transition hover:bg-[#14533C]/50"
            >
              <BellRing className="h-3.5 w-3.5" />
              Enable Desktop Alerts
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1F2924] font-mono text-xs font-bold text-[#A7F3D0] ring-1 ring-[#2C3831]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-[#7C8881]">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="rounded-md p-1.5 text-[#8A948E] transition hover:bg-[#1F2723] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column with Clean Editorial Top Bar */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E0D5] bg-[#F5F4EF]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.12em] text-[#78807B]">
              {currentItem?.group || 'Portal'}
            </span>
            <span className="text-[#C4C0B2]">/</span>
            <span className="font-semibold text-[#141917]">{currentItem?.label || 'Workspace'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-[11px] text-[#5C6460] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
              Telemetry Active
            </span>
            <Link
              to="/notifications"
              className="relative inline-flex items-center gap-1.5 rounded-md border border-[#D5D2C6] bg-white px-2.5 py-1 text-xs font-semibold text-[#141917] transition hover:bg-[#EFEDE6]"
            >
              <Bell className="h-3.5 w-3.5 text-[#5C6460]" />
              <span>Alerts</span>
              {unread > 0 && (
                <span className="rounded bg-[#B91C1C] px-1.5 font-mono text-[10px] font-bold text-white tabular-nums">
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="civic-enter mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Live Toast Feed */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex w-84 max-w-[calc(100vw-2rem)] flex-col gap-2.5"
        >
          {toasts.map((t) => (
            <div
              key={t._id}
              className="rounded-lg border border-[#D5D2C6] bg-white p-3.5 shadow-xl ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#141917]">
                  <span className="h-2 w-2 rounded-full bg-[#14533C]" />
                  <span>{t.title}</span>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item._id !== t._id))}
                  aria-label="Dismiss alert"
                  className="text-[#8A918C] hover:text-[#141917]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#5C6460]">{t.message}</p>
              {(t.emailSent || t.emailPreviewUrl) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  {t.emailSent && (
                    <span className="inline-flex items-center gap-1 rounded border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 font-medium text-[#065F46]">
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
                      className="inline-flex items-center gap-1 font-semibold text-[#14533C] hover:underline"
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
