import { useEffect, useState, type FormEvent } from 'react';
import api from '../services/api';
import type { CollectionZone } from '../types';

export function ZonesPage() {
  const [zones, setZones] = useState<CollectionZone[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [progress, setProgress] = useState<any | null>(null);

  const load = async () => {
    const res = await api.get('/zones');
    setZones(res.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/zones', {
      name,
      code,
      wardNumber,
      centerCoordinates: [77.5946, 12.9716],
      boundaryCoordinates: [
        [
          [77.58, 12.96],
          [77.61, 12.96],
          [77.61, 12.99],
          [77.58, 12.99],
          [77.58, 12.96]
        ]
      ]
    });
    setName('');
    setCode('');
    setWardNumber('');
    load();
  };

  const inspectProgress = async (id: string) => {
    const res = await api.get(`/zones/${id}/progress`);
    setProgress(res.data.data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Collection Zones</h1>
        <p className="text-sm text-slate-600">
          Create geographical GeoJSON zones and inspect zone-wise complaint & collection progress.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-4"
      >
        <input
          required
          placeholder="Zone Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Code (ZN-CENTRAL)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Ward Number"
          value={wardNumber}
          onChange={(e) => setWardNumber(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Create Zone
        </button>
      </form>

      {progress && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <strong>{progress.zoneName}:</strong> {progress.resolvedComplaints}/{progress.totalComplaints}{' '}
          complaints resolved · {progress.completedTasks}/{progress.totalTasks} tasks completed ·{' '}
          {progress.totalCollectedKg} kg collected.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {zones.map((z) => (
          <div key={z._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-sky-700">{z.code}</span>
              <button
                onClick={() => inspectProgress(z._id)}
                className="text-xs font-semibold text-sky-700 hover:underline"
              >
                View Progress
              </button>
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{z.name}</h3>
            <p className="text-xs text-slate-500">
              Workers: {z.assignedWorkers?.length || 0} · Vehicles: {z.assignedVehicles?.length || 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
