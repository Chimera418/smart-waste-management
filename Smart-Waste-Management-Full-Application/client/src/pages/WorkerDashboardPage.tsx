import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export function WorkerDashboardPage() {
  const { workerProfile, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});

  const loadTasks = async () => {
    const res = await api.get('/tasks');
    setTasks(res.data.data || []);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const setAvailability = async (availability: string) => {
    if (!workerProfile) return;
    await api.patch(`/workers/${workerProfile._id}/availability`, { availability });
    refreshUser();
  };

  const act = async (id: string, endpoint: string, body?: any) => {
    await api.patch(`/tasks/${id}/${endpoint}`, body);
    await loadTasks();
    await refreshUser();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sanitation Worker Dashboard</h1>
          <p className="text-sm text-slate-600">
            Code: {workerProfile?.employeeCode} · Completed: {workerProfile?.completedTasksCount || 0}
          </p>
        </div>
        {workerProfile && (
          <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
            {(['available', 'on_duty', 'on_break', 'off_duty'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAvailability(a)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                  workerProfile.availability === a ? 'bg-teal-600 text-white' : 'text-slate-600'
                }`}
              >
                {a.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t._id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-700">{t.taskCode}</span>
                <StatusBadge value={t.status} />
              </div>
              <p className="mt-1 text-sm font-semibold">{t.complaintId?.title}</p>
              <p className="text-xs text-slate-500">
                {t.complaintId?.address} · Vehicle: {t.assignedVehicleId?.registrationNumber}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {t.status === 'assigned' && (
                <>
                  <button
                    onClick={() => act(t._id, 'accept')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      const reason = window.prompt('Rejection reason:');
                      if (reason) act(t._id, 'reject', { reason });
                    }}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
                  >
                    Reject
                  </button>
                </>
              )}
              {t.status === 'accepted' && (
                <button
                  onClick={() => act(t._id, 'status', { status: 'en_route' })}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  En Route
                </button>
              )}
              {t.status === 'en_route' && (
                <button
                  onClick={() => act(t._id, 'status', { status: 'in_progress' })}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Start Collection
                </button>
              )}
              {['accepted', 'en_route', 'in_progress'].includes(t.status) && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={weights[t._id] ?? 60}
                    onChange={(e) => setWeights({ ...weights, [t._id]: Number(e.target.value) })}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() =>
                      act(t._id, 'status', {
                        status: 'completed',
                        collectedWeightKg: weights[t._id] ?? 60
                      })
                    }
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
