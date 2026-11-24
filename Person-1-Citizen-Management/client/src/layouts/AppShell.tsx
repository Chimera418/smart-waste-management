import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Bot,
  FilePlus2,
  History,
  LayoutDashboard,
  LogOut,
  Recycle,
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

  usePolling(loadUnread, 15000, Boolean(user));

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/complaints/new', label: 'Submit Complaint', icon: FilePlus2 },
    { to: '/complaints', label: 'My Complaints', icon: History },
    { to: '/chatbot', label: 'Waste Assistant', icon: Bot },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    { to: '/profile', label: 'Profile', icon: UserCircle2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-900 text-slate-100 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Recycle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">CivicClean SWM</p>
            <p className="text-xs text-slate-400">Citizen & Complaint Portal</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 p-3 lg:flex-col">
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

        <div className="border-t border-slate-800 p-4 lg:mt-auto">
          <div className="mb-3 text-xs">
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
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
