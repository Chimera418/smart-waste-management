import { useEffect, useState, type FormEvent } from 'react';
import api from '../services/api';
import type { Vehicle, Worker } from '../types';

export function FleetAndWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vForm, setVForm] = useState({
    registrationNumber: '',
    name: '',
    type: 'compactor',
    capacityKg: 3000
  });

  const load = async () => {
    const [wRes, vRes] = await Promise.all([api.get('/workers'), api.get('/vehicles')]);
    setWorkers(wRes.data.data || []);
    setVehicles(vRes.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addVehicle = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/vehicles', {
      ...vForm,
      capacityKg: Number(vForm.capacityKg),
      supportedWasteCategories: ['organic', 'plastic', 'recyclable', 'mixed']
    });
    setVForm({ registrationNumber: '', name: '', type: 'compactor', capacityKg: 3000 });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Sanitation Workers & Vehicle Fleet</h1>

      <form onSubmit={addVehicle} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-5">
        <input
          required
          placeholder="Reg No"
          value={vForm.registrationNumber}
          onChange={(e) => setVForm({ ...vForm, registrationNumber: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Vehicle Name"
          value={vForm.name}
          onChange={(e) => setVForm({ ...vForm, name: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={vForm.type}
          onChange={(e) => setVForm({ ...vForm, type: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="compactor">Compactor</option>
          <option value="tipper">Tipper</option>
          <option value="mini_truck">Mini Truck</option>
          <option value="hazmat_van">Hazmat Van</option>
          <option value="e_rickshaw">E-Rickshaw</option>
        </select>
        <input
          type="number"
          min={50}
          value={vForm.capacityKg}
          onChange={(e) => setVForm({ ...vForm, capacityKg: Number(e.target.value) })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Add Vehicle
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Fleet Vehicles ({vehicles.length})</h2>
          <div className="space-y-2 text-xs">
            {vehicles.map((v) => (
              <div key={v._id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between font-semibold">
                  <span>{v.registrationNumber} — {v.name}</span>
                  <span className="capitalize">{v.status.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-500">
                  {v.type} · Capacity: {v.capacityKg}kg · Trips: {v.totalTripsCompleted}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Sanitation Workers ({workers.length})</h2>
          <div className="space-y-2 text-xs">
            {workers.map((w) => (
              <div key={w._id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between font-semibold">
                  <span>{w.employeeCode} — {w.userId?.name}</span>
                  <span className="capitalize">{w.availability.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-500">
                  Shift: {w.shift} · Active: {w.activeTaskCount} · Completed: {w.completedTasksCount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
