import { useEffect, useState, type FormEvent } from 'react';
import { HardHat, Plus, Truck } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
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
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Fleet Operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Fleet Units & Sanitation Crew</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Register municipal vehicles, monitor cargo capacity, and inspect field worker shift availability.
        </p>
      </div>

      <form onSubmit={addVehicle} className="civic-card grid gap-3 p-5 sm:grid-cols-5 sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Reg. Number</label>
          <input
            required
            placeholder="KA-01-SW-505"
            value={vForm.registrationNumber}
            onChange={(e) => setVForm({ ...vForm, registrationNumber: e.target.value })}
            className="civic-input font-mono"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Vehicle Name</label>
          <input
            required
            placeholder="West Zone Compactor"
            value={vForm.name}
            onChange={(e) => setVForm({ ...vForm, name: e.target.value })}
            className="civic-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Fleet Type</label>
          <select
            value={vForm.type}
            onChange={(e) => setVForm({ ...vForm, type: e.target.value })}
            className="civic-input"
          >
            <option value="compactor">Garbage Truck (Compactor)</option>
            <option value="tipper">Tipper Truck</option>
            <option value="mini_truck">Mini Truck</option>
            <option value="hazmat_van">Hazmat Van</option>
            <option value="e_rickshaw">E-Auto (E-Rickshaw)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Capacity (kg)</label>
          <input
            type="number"
            min={50}
            value={vForm.capacityKg}
            onChange={(e) => setVForm({ ...vForm, capacityKg: Number(e.target.value) })}
            className="civic-input font-mono tabular-nums"
          />
        </div>
        <button className="civic-btn-primary h-[38px]">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="civic-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E0D5] bg-[#FAF9F6] px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#141917]">
              <Truck className="h-4 w-4 text-[#14533C]" />
              Fleet Vehicles ({vehicles.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EFECE4]">
            {vehicles.map((v) => (
              <div key={v._id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs">
                <div>
                  <p className="font-semibold text-[#141917]">
                    <span className="font-mono text-[#14533C]">{v.registrationNumber}</span> — {v.name}
                  </p>
                  <p className="mt-0.5 text-[#5C6460] tabular-nums">
                    <span className="capitalize">{v.type === 'e_rickshaw' ? 'E-Auto' : v.type.replace('_', ' ')}</span> ·
                    Capacity {v.capacityKg} kg · Trips {v.totalTripsCompleted}
                  </p>
                </div>
                <StatusBadge value={v.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="civic-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E0D5] bg-[#FAF9F6] px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#141917]">
              <HardHat className="h-4 w-4 text-[#14533C]" />
              Sanitation Workers ({workers.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EFECE4]">
            {workers.map((w) => (
              <div key={w._id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs">
                <div>
                  <p className="font-semibold text-[#141917]">
                    <span className="font-mono text-[#14533C]">{w.employeeCode}</span> — {w.userId?.name}
                  </p>
                  <p className="mt-0.5 text-[#5C6460] tabular-nums">
                    Shift: <span className="capitalize">{w.shift}</span> · Active: {w.activeTaskCount} · Completed:{' '}
                    {w.completedTasksCount}
                  </p>
                </div>
                <StatusBadge value={w.availability} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
