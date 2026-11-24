import { useEffect, useState } from 'react';
import api from '../services/api';

export function EscalationsPage() {
  const [data, setData] = useState<{ escalations: any[]; overdueComplaints: any[] }>({
    escalations: [],
    overdueComplaints: []
  });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await api.get('/admin/escalations');
    setData(res.data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const runScan = async () => {
    const res = await api.post('/admin/escalations/run');
    setMsg(`Scan complete: escalated ${res.data.data.escalatedCount} overdue complaint(s).`);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automatic Complaint Escalation</h1>
          <p className="text-sm text-slate-600">
            Tracks SLA resolution deadlines and prevents duplicate escalations via 6-hour cooldown.
          </p>
        </div>
        <button
          onClick={runScan}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Run Escalation Scan
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Overdue Unresolved Complaints ({data.overdueComplaints.length})</h2>
          <div className="space-y-2 text-xs">
            {data.overdueComplaints.map((c) => (
              <div key={c._id} className="rounded-lg bg-slate-50 p-3">
                <span className="font-mono font-bold">{c.complaintCode}</span> · {c.title} · Level{' '}
                {c.escalationLevel}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Escalation History ({data.escalations.length})</h2>
          <div className="space-y-2 text-xs">
            {data.escalations.map((e) => (
              <div key={e._id} className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                <span className="font-mono font-bold">{e.complaintCode}</span> · L{e.escalationLevel} (
                {e.previousPriority} → {e.newPriority}) — {e.reason}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
