import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../services/api';

export function ComplaintsMonitorPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await api.get('/complaints');
    setComplaints(res.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const estimateWithAi = async (c: any) => {
    const res = await api.post('/ai/priority', {
      complaintId: c._id,
      description: c.description,
      wasteCategory: c.wasteCategory,
      coordinates: c.location.coordinates,
      submittedAt: c.createdAt
    });
    setMsg(
      `${c.complaintCode}: AI suggested ${res.data.data.suggestedPriority.toUpperCase()} (score ${res.data.data.score}/100)`
    );
    load();
  };

  const overridePriority = async (c: any, priority: string) => {
    const reason = window.prompt('Enter override justification:');
    if (!reason || reason.trim().length < 3) return;
    await api.patch(`/admin/complaints/${c._id}/priority`, { priority, overrideReason: reason });
    setMsg(`Overrode ${c.complaintCode} priority to ${priority.toUpperCase()}`);
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints & Gemini Priority Estimation</h1>
        <p className="text-sm text-slate-600">
          Run AI priority scoring (validated with safety & density rules) or manually override priority.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          {msg}
        </div>
      )}

      <div className="space-y-3">
        {complaints.map((c) => (
          <div
            key={c._id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="max-w-2xl space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">{c.complaintCode}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">
                  {c.priority}
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{c.title}</p>
              <p className="text-xs text-slate-600">{c.description}</p>
              {c.aiPriority?.reasoning && (
                <p className="text-[11px] text-indigo-700">
                  AI Reasoning: {c.aiPriority.reasoning}{' '}
                  {c.aiPriority.overriddenByAdmin ? `(Admin Override: ${c.aiPriority.overrideReason})` : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => estimateWithAi(c)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Estimate Priority
              </button>
              <select
                value={c.priority}
                onChange={(e) => overridePriority(c, e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
