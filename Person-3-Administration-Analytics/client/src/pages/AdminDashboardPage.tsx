import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<any | null>(null);

  useEffect(() => {
    api.get('/admin/overview').then((res) => setOverview(res.data.data));
  }, []);

  if (!overview) return <div className="p-6 text-sm text-slate-500">Loading command center...</div>;
  const { summary, usersByRole, zonesCount, recentEscalations } = overview;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Command Center</h1>
          <p className="text-sm text-slate-600">
            System-wide operational metrics, registered roles, and active escalations.
          </p>
        </div>
        <Link
          to="/analytics"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Open Recharts Analytics
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Complaints</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.totalComplaints}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Collection Efficiency</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {summary.collectionEfficiencyPct}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">SLA Compliance</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{summary.slaCompliancePct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Open Escalations</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{summary.openEscalations}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Registered Stakeholders</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              Citizens: <strong>{usersByRole.citizen || 0}</strong>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              Sanitation Workers: <strong>{usersByRole.worker || 0}</strong>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              Vehicle Operators: <strong>{usersByRole.vehicle_operator || 0}</strong>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              Active Zones: <strong>{zonesCount}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Escalations</h2>
          {recentEscalations.length === 0 ? (
            <p className="text-sm text-slate-500">No escalations recorded.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {recentEscalations.map((e: any) => (
                <div key={e._id} className="rounded-lg border border-rose-200 bg-rose-50/70 p-2.5">
                  <span className="font-mono font-bold text-rose-800">{e.complaintCode}</span> ·
                  Level {e.escalationLevel} ({e.previousPriority} → {e.newPriority}) — {e.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
