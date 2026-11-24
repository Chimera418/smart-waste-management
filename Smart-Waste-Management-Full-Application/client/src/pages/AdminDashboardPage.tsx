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
          <p className="text-sm text-slate-600">Unified oversight across citizens, sanitation crews, fleet, and SLAs.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/dispatch" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
            Dispatch & Priority
          </Link>
          <Link to="/analytics" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Analytics
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Total Complaints</p>
          <p className="mt-1 text-3xl font-bold">{summary.totalComplaints}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Collection Efficiency</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{summary.collectionEfficiencyPct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">SLA Compliance</p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{summary.slaCompliancePct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Open Escalations</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">{summary.openEscalations}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">System Directory</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">Citizens: <strong>{usersByRole.citizen || 0}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Workers: <strong>{usersByRole.worker || 0}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Operators: <strong>{usersByRole.vehicle_operator || 0}</strong></div>
            <div className="rounded-lg bg-slate-50 p-3">Active Zones: <strong>{zonesCount}</strong></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Recent SLA Escalations</h2>
          {recentEscalations.length === 0 ? (
            <p className="text-sm text-slate-500">No active escalations.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {recentEscalations.map((e: any) => (
                <div key={e._id} className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                  <strong className="font-mono">{e.complaintCode}</strong> · L{e.escalationLevel} ({e.previousPriority} → {e.newPriority})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
