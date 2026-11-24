import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardHat, MapPin, Sparkles, Truck } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { usePolling } from '../hooks/usePolling';
import type { Vehicle, Worker } from '../types';

export function AdminDispatchPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [aiExplain, setAiExplain] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [cRes, wRes, vRes] = await Promise.all([
      api.get('/complaints'),
      api.get('/workers'),
      api.get('/vehicles')
    ]);
    setComplaints(cRes.data.data || []);
    setWorkers(wRes.data.data || []);
    setVehicles(vRes.data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, 5000, true);

  const estimateAiPriority = async (c: any) => {
    const res = await api.post('/ai/priority', {
      complaintId: c._id,
      description: c.description,
      wasteCategory: c.wasteCategory,
      coordinates: c.location.coordinates,
      submittedAt: c.createdAt
    });
    setMsg(
      `${c.complaintCode}: AI estimated ${res.data.data.suggestedPriority.toUpperCase()} (${res.data.data.score}/100)`
    );
    load();
  };

  const overridePriority = async (c: any, priority: string) => {
    const reason = window.prompt('Enter priority override justification:');
    if (!reason || reason.trim().length < 3) return;
    await api.patch(`/admin/complaints/${c._id}/priority`, { priority, overrideReason: reason });
    setMsg(`Overrode ${c.complaintCode} priority to ${priority.toUpperCase()}`);
    load();
  };

  const runRecommender = async (c: any) => {
    setSelected(c);
    const res = await api.post('/vehicles/recommend', {
      coordinates: c.location.coordinates,
      wasteCategory: c.wasteCategory,
      estimatedWeightKg: c.estimatedWeightKg || 50,
      zoneId: c.zoneId?._id,
      includeAiExplanation: true
    });
    setRecs(res.data.data.recommendations || []);
    setAiExplain(res.data.data.aiExplanation || '');
    if (res.data.data.topRecommendation) {
      setVehicleId(res.data.data.topRecommendation.vehicle._id);
    }
    if (workers.length > 0 && !workerId) setWorkerId(workers[0]._id);
  };

  const dispatchTask = async () => {
    if (!selected || !workerId || !vehicleId) return;
    const match = recs.find((r) => r.vehicle._id === vehicleId);
    await api.post('/tasks', {
      complaintId: selected._id,
      assignedWorkerId: workerId,
      assignedVehicleId: vehicleId,
      recommendationSnapshot: match
        ? { score: match.score, distanceKm: match.distanceKm, reason: aiExplain }
        : undefined
    });
    setMsg(`Dispatched crew & vehicle for ${selected.complaintCode}`);
    setSelected(null);
    setRecs([]);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints, AI Priority & Task Dispatch</h1>
        <p className="text-sm text-slate-600">
          Inspect assigned workers & vehicles, run Gemini priority estimation, and dispatch optimal fleet units.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white lg:col-span-7">
          {complaints.map((c) => {
            const task = c.assignedTaskId;
            const worker = task?.assignedWorkerId;
            const vehicle = task?.assignedVehicleId;
            return (
              <div key={c._id} className="space-y-2.5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{c.complaintCode}</span>
                    <StatusBadge value={c.priority} />
                    <StatusBadge value={c.status} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => estimateAiPriority(c)}
                      className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800"
                    >
                      <Sparkles className="h-3 w-3" /> AI Priority
                    </button>
                    <select
                      value={c.priority}
                      onChange={(e) => overridePriority(c, e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="critical">critical</option>
                    </select>
                    <button
                      onClick={() => runRecommender(c)}
                      disabled={c.status === 'resolved'}
                      className="rounded bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {task ? 'Reassign' : 'Dispatch'}
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="text-xs text-slate-600">
                  {c.address} · Category: <strong className="capitalize">{c.wasteCategory}</strong>
                  {c.zoneId?.code && <span className="ml-2 text-slate-500">· Zone {c.zoneId.code}</span>}
                  {c.duplicateAnalysis?.isPotentialDuplicate && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      Potential Duplicate Flagged
                    </span>
                  )}
                </p>

                {task ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-800">{task.taskCode}</span>
                        <StatusBadge value={task.status} />
                      </div>
                      <Link
                        to="/tracking"
                        className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
                      >
                        <MapPin className="h-3 w-3" /> View on Live Map →
                      </Link>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <HardHat className="h-3.5 w-3.5 text-teal-700" />
                        Worker: <strong>{worker?.userId?.name || 'Assigned'}</strong> ({worker?.employeeCode})
                        {worker?.userId?.phone ? ` · ${worker.userId.phone}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-sky-700" />
                        Vehicle: <strong>{vehicle?.registrationNumber}</strong> ({vehicle?.name})
                        {vehicle?.operatorId?.name ? ` · Op: ${vehicle.operatorId.name}` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Unassigned — needs dispatch
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="text-sm font-semibold">
            {selected ? `Assign Resources for ${selected.complaintCode}` : 'Click "Dispatch" on a complaint'}
          </h2>
          {aiExplain && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              {aiExplain}
            </div>
          )}
          <div className="space-y-2">
            {recs.map((r) => (
              <div
                key={r.vehicle._id}
                onClick={() => r.eligible && setVehicleId(r.vehicle._id)}
                className={`cursor-pointer rounded-lg border p-2.5 text-xs ${
                  vehicleId === r.vehicle._id ? 'border-teal-600 bg-teal-50' : 'border-slate-200'
                } ${!r.eligible ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between font-semibold">
                  <span>{r.vehicle.registrationNumber} ({r.vehicle.type})</span>
                  <span>{r.score}/100</span>
                </div>
                <p className="text-slate-600">
                  {r.distanceKm}km away · {r.remainingCapacityKg}kg cap left
                  {r.ineligibleReason ? ` · ${r.ineligibleReason}` : ''}
                </p>
              </div>
            ))}
          </div>
          {selected && (
            <div className="space-y-2.5 pt-2">
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Worker</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.employeeCode} — {w.userId?.name} ({w.availability})
                  </option>
                ))}
              </select>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} — {v.name}
                  </option>
                ))}
              </select>
              <button
                onClick={dispatchTask}
                disabled={!workerId || !vehicleId}
                className="w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm Task Dispatch
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
