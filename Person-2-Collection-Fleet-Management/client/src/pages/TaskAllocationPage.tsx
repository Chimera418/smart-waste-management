import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../services/api';
import type { Vehicle, Worker } from '../types';

export function TaskAllocationPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [cRes, wRes, vRes] = await Promise.all([
      api.get('/complaints'),
      api.get('/workers'),
      api.get('/vehicles')
    ]);
    setComplaints(cRes.data.data || []);
    setWorkers(wRes.data.data || []);
    setVehicles(vRes.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const runRecommender = async (complaint: any) => {
    setSelectedComplaint(complaint);
    setMsg('');
    const res = await api.post('/vehicles/recommend', {
      coordinates: complaint.location.coordinates,
      wasteCategory: complaint.wasteCategory,
      estimatedWeightKg: complaint.estimatedWeightKg || 50,
      zoneId: complaint.zoneId?._id,
      includeAiExplanation: true
    });
    const recs = res.data.data.recommendations || [];
    setRecommendations(recs);
    setAiExplanation(res.data.data.aiExplanation || '');
    if (res.data.data.topRecommendation) {
      setVehicleId(res.data.data.topRecommendation.vehicle._id);
    }
    if (workers.length > 0 && !workerId) {
      setWorkerId(workers[0]._id);
    }
  };

  const assignTask = async () => {
    if (!selectedComplaint || !workerId || !vehicleId) return;
    const matched = recommendations.find((r) => r.vehicle._id === vehicleId);
    await api.post('/tasks', {
      complaintId: selectedComplaint._id,
      assignedWorkerId: workerId,
      assignedVehicleId: vehicleId,
      recommendationSnapshot: matched
        ? { score: matched.score, distanceKm: matched.distanceKm, reason: aiExplanation }
        : undefined
    });
    setMsg(`Dispatched task for ${selectedComplaint.complaintCode}`);
    setSelectedComplaint(null);
    setRecommendations([]);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Task Allocation & Vehicle Recommender</h1>
        <p className="text-sm text-slate-600">
          Evaluate eligible fleet vehicles deterministically by capacity, distance, availability, and waste type.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs lg:col-span-5">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
            Open Complaints Queue
          </div>
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-500">{c.complaintCode}</p>
                  <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {c.wasteCategory} · {c.status}
                  </p>
                </div>
                <button
                  onClick={() => runRecommender(c)}
                  className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                >
                  Recommend Fleet
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <h2 className="text-sm font-semibold text-slate-900">
            {selectedComplaint
              ? `Vehicle Scoring for ${selectedComplaint.complaintCode}`
              : 'Select a complaint to run vehicle recommendation'}
          </h2>

          {aiExplanation && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <span>{aiExplanation}</span>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div
                  key={rec.vehicle._id}
                  onClick={() => rec.eligible && setVehicleId(rec.vehicle._id)}
                  className={`cursor-pointer rounded-lg border p-3 text-xs ${
                    vehicleId === rec.vehicle._id
                      ? 'border-sky-600 bg-sky-50/60'
                      : 'border-slate-200'
                  } ${!rec.eligible ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>
                      {rec.vehicle.registrationNumber} — {rec.vehicle.name} ({rec.vehicle.type})
                    </span>
                    <span className="text-sky-700">Score: {rec.score}/100</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Distance: {rec.distanceKm} km · Remaining Capacity: {rec.remainingCapacityKg} kg
                    · Active Tasks: {rec.activeAssignments}
                    {rec.ineligibleReason ? ` · Blocked: ${rec.ineligibleReason}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedComplaint && (
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Sanitation Worker</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.employeeCode} — {w.userId?.name} ({w.availability})
                  </option>
                ))}
              </select>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} — {v.name}
                  </option>
                ))}
              </select>
              <button
                onClick={assignTask}
                disabled={!workerId || !vehicleId}
                className="sm:col-span-2 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Dispatch Collection Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
