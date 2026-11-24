import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
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
    setMsg(`Escalated ${res.data.data.escalatedCount} overdue complaint(s).`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B91C1C]">
            SLA Enforcement
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">Automatic SLA Escalations</h1>
          <p className="mt-1 text-sm text-[#5C6460]">
            Monitors overdue resolution windows with a 6-hour anti-duplicate cooldown.
          </p>
        </div>
        <button
          onClick={runScan}
          className="inline-flex items-center gap-2 rounded-lg bg-[#B91C1C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#991B1B]"
        >
          <ShieldAlert className="h-4 w-4" />
          Run Escalation Scan
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 text-sm font-medium text-[#92400E]">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="civic-card overflow-hidden">
          <div className="border-b border-[#E2E0D5] bg-[#FAF9F6] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[#141917]">
              Overdue Unresolved ({data.overdueComplaints.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EFECE4]">
            {data.overdueComplaints.length === 0 ? (
              <p className="p-6 text-xs text-[#5C6460]">No overdue complaints.</p>
            ) : (
              data.overdueComplaints.map((c) => (
                <div key={c._id} className="px-5 py-3 text-xs">
                  <strong className="font-mono text-[#141917]">{c.complaintCode}</strong> · {c.title} ·{' '}
                  <span className="font-mono text-[#B91C1C]">Level {c.escalationLevel}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="civic-card overflow-hidden">
          <div className="border-b border-[#E2E0D5] bg-[#FAF9F6] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[#141917]">
              Escalation History ({data.escalations.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EFECE4]">
            {data.escalations.length === 0 ? (
              <p className="p-6 text-xs text-[#5C6460]">No escalations recorded yet.</p>
            ) : (
              data.escalations.map((e) => (
                <div key={e._id} className="px-5 py-3 text-xs">
                  <strong className="font-mono text-[#141917]">{e.complaintCode}</strong> ·{' '}
                  <span className="font-semibold text-[#B91C1C]">L{e.escalationLevel}</span> ({e.previousPriority} →{' '}
                  <strong className="uppercase">{e.newPriority}</strong>) —{' '}
                  <span className="text-[#5C6460]">{e.reason}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
