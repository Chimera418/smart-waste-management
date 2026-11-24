import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  BarChart3,
  Bell,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/admin', label: 'Command Center', icon: LayoutDashboard },
    { to: '/complaints', label: 'Complaints & AI Priority', icon: ListChecks },
    { to: '/analytics', label: 'Analytics Dashboard', icon: BarChart3 },
    { to: '/hotspots', label: 'Geospatial Hotspots', icon: Flame },
    { to: '/escalations', label: 'Escalations & SLA', icon: AlertOctagon },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/audit', label: 'Security & Audit', icon: ShieldCheck },
    { to: '/reports', label: 'Users & Reports', icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">CivicClean Admin</p>
            <p className="text-xs text-slate-400">Analytics & Governance</p>
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
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="text-xs font-semibold text-white">{user?.name}</p>
          <p className="mb-3 text-xs text-slate-400">{user?.email}</p>
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
