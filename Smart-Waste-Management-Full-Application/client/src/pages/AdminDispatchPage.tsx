import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Gauge, HardHat, MapPin, Truck } from 'lucide-react';
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
      `${c.complaintCode}: Priority scored ${res.data.data.suggestedPriority.toUpperCase()} (${res.data.data.score}/100)`
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

  const markResolved = async (c: any) => {
    if (!c.assignedTaskId?._id) return;
    await api.patch(`/tasks/${c.assignedTaskId._id}/status`, {
      status: 'completed',
      collectedWeightKg: c.estimatedWeightKg || 50,
      note: 'Marked completed and verified by municipal dispatch.'
    });
    setMsg(`Marked ${c.complaintCode} (${c.assignedTaskId.taskCode}) as resolved.`);
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
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Dispatch & Routing
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Complaints & Fleet Dispatch</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Review incoming reports, score SLA urgency, assign optimal fleet units, and verify resolution.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-sm font-medium text-[#065F46]">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="civic-card divide-y divide-[#EFECE4] overflow-hidden lg:col-span-7">
          {complaints.map((c) => {
            const task = c.assignedTaskId;
            const worker = task?.assignedWorkerId;
            const vehicle = task?.assignedVehicleId;
            return (
              <div key={c._id} className="space-y-2.5 p-4 transition hover:bg-[#FAF9F6]/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#141917]">{c.complaintCode}</span>
                    <StatusBadge value={c.priority} />
                    <StatusBadge value={c.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => estimateAiPriority(c)}
                      className="rounded-md border border-[#D5D2C6] bg-white px-2.5 py-1 text-xs font-semibold text-[#141917] hover:bg-[#F5F4EF]"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-[#14533C]" /> Score Priority
                      </span>
                    </button>
                    <select
                      aria-label="Override priority"
                      value={c.priority}
                      onChange={(e) => overridePriority(c, e.target.value)}
                      className="rounded-md border border-[#D5D2C6] bg-white px-2 py-1 text-xs font-medium text-[#141917]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button
                      onClick={() => runRecommender(c)}
                      disabled={c.status === 'resolved'}
                      className="civic-btn-primary py-1 text-xs"
                    >
                      {task ? 'Reassign' : 'Dispatch'}
                    </button>
                  </div>
                </div>

                <p className="text-sm font-bold text-[#141917]">{c.title}</p>
                <p className="text-xs text-[#5C6460]">
                  {c.address} · Category: <strong className="capitalize text-[#141917]">{c.wasteCategory}</strong>
                  {c.zoneId?.code && <span className="ml-2 font-mono text-[#78807B]">· {c.zoneId.code}</span>}
                  {c.duplicateAnalysis?.isPotentialDuplicate && (
                    <span className="ml-2 rounded border border-[#FDE68A] bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
                      Nearby Duplicate Flagged
                    </span>
                  )}
                </p>

                {task ? (
                  <div className="rounded-lg border border-[#E2E0D5] bg-[#FAF9F6] p-3 text-xs text-[#141917]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#14533C]">{task.taskCode}</span>
                        <StatusBadge value={task.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        {c.status !== 'resolved' && (
                          <button
                            onClick={() => markResolved(c)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#065F46] hover:bg-[#D1FAE5]"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Mark Resolved
                          </button>
                        )}
                        <Link
                          to="/tracking"
                          className="inline-flex items-center gap-1 font-semibold text-[#14533C] hover:underline"
                        >
                          <MapPin className="h-3 w-3" /> Live Map →
                        </Link>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#5C6460]">
                      <span className="inline-flex items-center gap-1">
                        <HardHat className="h-3.5 w-3.5 text-[#14533C]" />
                        Crew: <strong className="text-[#141917]">{worker?.userId?.name || 'Assigned'}</strong> (
                        {worker?.employeeCode})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-[#1D4ED8]" />
                        Unit: <strong className="font-mono text-[#141917]">{vehicle?.registrationNumber}</strong> (
                        {vehicle?.name})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-block rounded-md border border-[#E2E0D5] bg-[#F5F4EF] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#78807B]">
                    Unassigned · Pending Dispatch
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="civic-card h-fit space-y-4 p-5 lg:sticky lg:top-20 lg:col-span-5">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78807B]">
              Weighted Recommender
            </p>
            <h2 className="mt-0.5 text-sm font-bold text-[#141917]">
              {selected ? `Assign Resources · ${selected.complaintCode}` : 'Select "Dispatch" on any report'}
            </h2>
          </div>

          {aiExplain && (
            <div className="rounded-lg border border-[#E2E0D5] bg-[#FAF9F6] p-3 text-xs leading-relaxed text-[#374151]">
              {aiExplain}
            </div>
          )}

          <div className="space-y-2">
            {recs.map((r) => (
              <div
                key={r.vehicle._id}
                onClick={() => r.eligible && setVehicleId(r.vehicle._id)}
                className={`cursor-pointer rounded-lg border p-3 text-xs transition ${
                  vehicleId === r.vehicle._id
                    ? 'border-[#14533C] bg-[#ECFDF5]/60 ring-1 ring-[#14533C]/20'
                    : 'border-[#E2E0D5] bg-white hover:border-[#BDB9AA]'
                } ${!r.eligible ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between font-semibold text-[#141917]">
                  <span className="font-mono">
                    {r.vehicle.registrationNumber}{' '}
                    <span className="font-sans font-normal capitalize text-[#5C6460]">
                      ({r.vehicle.type.replace('_', ' ')})
                    </span>
                  </span>
                  <span className="rounded bg-[#141917] px-1.5 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums">
                    {r.score}/100
                  </span>
                </div>
                <p className="mt-1 text-[#5C6460] tabular-nums">
                  {r.distanceKm} km away · {r.remainingCapacityKg} kg remaining
                  {r.ineligibleReason ? ` · ${r.ineligibleReason}` : ''}
                </p>
              </div>
            ))}
          </div>

          {selected && (
            <div className="space-y-3 border-t border-[#E2E0D5] pt-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Sanitation Worker</label>
                <select
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="civic-input"
                >
                  <option value="">Select Worker</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.employeeCode} — {w.userId?.name} ({w.availability})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Fleet Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="civic-input"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.registrationNumber} — {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={dispatchTask}
                disabled={!workerId || !vehicleId}
                className="civic-btn-primary w-full py-2.5"
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
