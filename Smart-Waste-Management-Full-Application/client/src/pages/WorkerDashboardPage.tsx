import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Truck } from 'lucide-react';
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
            Field Crew Console
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">Sanitation Assignments</h1>
          <p className="mt-1 font-mono text-xs text-[#5C6460]">
            ID: {workerProfile?.employeeCode || '—'} · Completed Pickups:{' '}
            <strong className="text-[#141917]">{workerProfile?.completedTasksCount || 0}</strong>
          </p>
        </div>

        {workerProfile && (
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#D5D2C6] bg-white p-1">
            {(['available', 'on_duty', 'on_break', 'off_duty'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAvailability(a)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  workerProfile.availability === a
                    ? 'bg-[#14533C] text-white'
                    : 'text-[#5C6460] hover:bg-[#F5F4EF] hover:text-[#141917]'
                }`}
              >
                {a.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="civic-card p-8 text-center text-sm text-[#5C6460]">
          No field collection tasks assigned right now.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t._id}
              className="civic-card flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#14533C]">{t.taskCode}</span>
                  <StatusBadge value={t.status} />
                  {t.complaintId?.complaintCode && (
                    <span className="font-mono text-[11px] text-[#78807B]">
                      Ref: {t.complaintId.complaintCode}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-[#141917]">{t.complaintId?.title}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C6460]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#8A918C]" />
                    {t.complaintId?.address}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Truck className="h-3.5 w-3.5 text-[#14533C]" />
                    {t.assignedVehicleId?.registrationNumber}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {t.status === 'assigned' && (
                  <>
                    <button
                      onClick={() => act(t._id, 'accept')}
                      className="civic-btn-primary py-1.5 text-xs"
                    >
                      Accept Task
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Rejection reason:');
                        if (reason) act(t._id, 'reject', { reason });
                      }}
                      className="rounded-lg border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] hover:bg-[#FEF2F2]"
                    >
                      Reject
                    </button>
                  </>
                )}

                {t.status === 'accepted' && (
                  <button
                    onClick={() => act(t._id, 'status', { status: 'en_route' })}
                    className="rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E40AF]"
                  >
                    Mark En Route
                  </button>
                )}

                {t.status === 'en_route' && (
                  <button
                    onClick={() => act(t._id, 'status', { status: 'in_progress' })}
                    className="rounded-lg bg-[#B45309] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#92400E]"
                  >
                    Start Collection
                  </button>
                )}

                {['accepted', 'en_route', 'in_progress'].includes(t.status) && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#E2E0D5] bg-[#FAF9F6] px-2.5 py-1.5">
                    <label
                      htmlFor={`weight-${t._id}`}
                      className="text-[11px] font-semibold text-[#5C6460]"
                    >
                      Collected (kg)
                    </label>
                    <input
                      id={`weight-${t._id}`}
                      type="number"
                      min={1}
                      value={weights[t._id] ?? 60}
                      onChange={(e) => setWeights({ ...weights, [t._id]: Number(e.target.value) })}
                      className="w-18 rounded-md border border-[#D5D2C6] bg-white px-2 py-1 font-mono text-xs text-[#141917] tabular-nums focus:border-[#14533C] focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        act(t._id, 'status', {
                          status: 'completed',
                          collectedWeightKg: weights[t._id] ?? 60
                        })
                      }
                      className="civic-btn-primary py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete & Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
