import { useEffect, useState, type FormEvent } from 'react';
import api from '../services/api';
import type { Vehicle } from '../types';

export function FleetManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    registrationNumber: '',
    name: '',
    type: 'compactor',
    capacityKg: 3000
  });

  const load = async () => {
    const res = await api.get('/vehicles');
    setVehicles(res.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/vehicles', {
      ...form,
      capacityKg: Number(form.capacityKg),
      supportedWasteCategories:
        form.type === 'hazmat_van'
          ? ['hazardous', 'medical', 'electronic']
          : ['organic', 'plastic', 'recyclable', 'mixed']
    });
    setForm({ registrationNumber: '', name: '', type: 'compactor', capacityKg: 3000 });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vehicle & Fleet Management</h1>
        <p className="text-sm text-slate-600">
          Register municipal collection vehicles, inspect capacity utilization, and manage status.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-5"
      >
        <input
          required
          placeholder="Reg. No (KA-01-SW-101)"
          value={form.registrationNumber}
          onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Vehicle Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
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
          value={form.capacityKg}
          onChange={(e) => setForm({ ...form, capacityKg: Number(e.target.value) })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Register Vehicle
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {vehicles.map((v) => {
          const pct = Math.min(100, Math.round(((v.currentLoadKg || 0) / v.capacityKg) * 100));
          return (
            <div key={v._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-700">
                  {v.registrationNumber}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize">
                  {v.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{v.name}</h3>
              <p className="text-xs text-slate-500 capitalize">
                Type: {v.type.replace('_', ' ')} · Trips: {v.totalTripsCompleted} · Total:{' '}
                {v.totalWasteCollectedKg} kg
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span>Current Load</span>
                  <span>
                    {v.currentLoadKg} / {v.capacityKg} kg ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-sky-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
