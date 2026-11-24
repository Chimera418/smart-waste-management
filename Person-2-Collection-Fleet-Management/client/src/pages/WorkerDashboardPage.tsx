import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { CollectionTask } from '../types';

export function WorkerDashboardPage() {
  const { workerProfile, refresh } = useAuth();
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [collectedWeight, setCollectedWeight] = useState<Record<string, number>>({});

  const loadTasks = async () => {
    const res = await api.get('/tasks');
    setTasks(res.data.data || []);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const updateAvailability = async (availability: string) => {
    if (!workerProfile) return;
    await api.patch(`/workers/${workerProfile._id}/availability`, { availability });
    await refresh();
  };

  const acceptTask = async (id: string) => {
    await api.patch(`/tasks/${id}/accept`);
    loadTasks();
  };

  const rejectTask = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason || reason.trim().length < 3) return;
    await api.patch(`/tasks/${id}/reject`, { reason });
    loadTasks();
  };

  const updateStatus = async (id: string, status: 'en_route' | 'in_progress' | 'completed') => {
    await api.patch(`/tasks/${id}/status`, {
      status,
      collectedWeightKg: status === 'completed' ? collectedWeight[id] || 60 : undefined,
      note: `Worker updated status to ${status}`
    });
    await loadTasks();
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sanitation Worker Console</h1>
          <p className="text-sm text-slate-600">
            Manage availability, accept or reject assigned tasks, and log collection completions.
          </p>
        </div>

        {workerProfile && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
            <span className="px-2 text-xs font-semibold text-slate-500">Availability:</span>
            {(['available', 'on_duty', 'on_break', 'off_duty'] as const).map((status) => (
              <button
                key={status}
                onClick={() => updateAvailability(status)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                  workerProfile.availability === status
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Employee Code</p>
          <p className="mt-1 font-mono text-lg font-bold text-slate-900">
            {workerProfile?.employeeCode || 'Operations View'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Active Tasks</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {tasks.filter((t) => !['completed', 'rejected', 'cancelled'].includes(t.status)).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completed Collections</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {tasks.filter((t) => t.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No collection tasks assigned yet.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-sky-700">{task.taskCode}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{task.complaintId?.title}</p>
                <p className="text-xs text-slate-600">
                  Location: {task.complaintId?.address} · Vehicle:{' '}
                  <strong>{task.assignedVehicleId?.registrationNumber}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {task.status === 'assigned' && (
                  <>
                    <button
                      onClick={() => acceptTask(task._id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectTask(task._id)}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {task.status === 'accepted' && (
                  <button
                    onClick={() => updateStatus(task._id, 'en_route')}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Mark En Route
                  </button>
                )}
                {task.status === 'en_route' && (
                  <button
                    onClick={() => updateStatus(task._id, 'in_progress')}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Start Collection
                  </button>
                )}
                {(task.status === 'in_progress' || task.status === 'accepted') && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      placeholder="kg"
                      value={collectedWeight[task._id] ?? 60}
                      onChange={(e) =>
                        setCollectedWeight({ ...collectedWeight, [task._id]: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => updateStatus(task._id, 'completed')}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
