import { useEffect, useState } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export function ComplaintsHistoryPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    api.get('/complaints').then((res) => setComplaints(res.data.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Complaints & Status Timeline</h1>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white lg:col-span-7">
          {complaints.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
            >
              <div>
                <p className="font-mono text-xs font-semibold text-slate-500">{c.complaintCode}</p>
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="text-xs text-slate-500">{c.address}</p>
              </div>
              <StatusBadge value={c.status} />
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a complaint to inspect its timeline.</p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="font-mono font-bold text-teal-700">{selected.complaintCode}</span>
                <StatusBadge value={selected.status} />
              </div>
              <h2 className="text-base font-bold text-slate-900">{selected.title}</h2>
              <p className="text-slate-600">{selected.description}</p>
              <ol className="space-y-2 border-l-2 border-teal-200 pl-3">
                {(selected.statusHistory || []).map((s: any, i: number) => (
                  <li key={i}>
                    <strong className="capitalize">{s.status.replace('_', ' ')}</strong> ·{' '}
                    {new Date(s.changedAt).toLocaleString()}
                    {s.note && <p className="text-slate-600">{s.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
