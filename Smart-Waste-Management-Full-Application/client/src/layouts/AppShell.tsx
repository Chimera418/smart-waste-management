import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  BarChart3,
  Bell,
  Bot,
  ClipboardCheck,
  FilePlus2,
  FileSpreadsheet,
  Flame,
  HardHat,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Navigation,
  Recycle,
  ShieldCheck,
  Truck,
  UserCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setUnread(res.data.data.unreadCount || 0);
    } catch {
      // Ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  usePolling(loadUnread, 12000, Boolean(user));

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
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
                    ? 'bg-teal-600 text-white'
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

        <div className="border-t border-slate-800 p-4">
          <p className="text-xs font-semibold text-white">{user?.name}</p>
          <p className="mb-3 text-[11px] uppercase tracking-wider text-teal-400">
            {user?.role?.replace('_', ' ')}
          </p>
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
    </div>
  );
}
