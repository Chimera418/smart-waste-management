import { useCallback, useEffect, useState } from 'react';
import { LocateFixed, Navigation, Pause, Play, StepForward } from 'lucide-react';
import api from '../services/api';
import type { Vehicle } from '../types';

export function OperatorDashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [lng, setLng] = useState('77.5945');
  const [lat, setLat] = useState('12.9718');
  const [msg, setMsg] = useState('');
  const [autoDrive, setAutoDrive] = useState(false);

  const load = useCallback(async () => {
    const [vRes, tRes] = await Promise.all([api.get('/vehicles?mine=true'), api.get('/tasks')]);
    const list: Vehicle[] = vRes.data.data || [];
    setVehicles(list);
    setTasks(tRes.data.data || []);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0]._id);
      setLng(String(list[0].currentLocation.coordinates[0]));
      setLat(String(list[0].currentLocation.coordinates[1]));
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateGps = async (newLng: number, newLat: number) => {
    if (!selectedId) return;
    await api.patch(`/vehicles/${selectedId}/location`, {
      coordinates: [newLng, newLat],
      speedKmh: 30,
      heading: 120
    });
    setMsg(`Broadcasted live GPS [${newLng}, ${newLat}]`);
    load();
  };

  const simulateStep = useCallback(async () => {
    if (!selectedId) return;
    const res = await api.post('/vehicles/simulate-step', { vehicleId: selectedId });
    const upd = res.data.data.updates?.[0];
    if (upd) {
      setLng(String(upd.coordinates[0]));
      setLat(String(upd.coordinates[1]));
      setMsg(
        upd.arrived
          ? `Arrived at destination! Citizen & Admin notified via app + email.`
          : `Simulated step to [${upd.coordinates[0]}, ${upd.coordinates[1]}] (${upd.speedKmh} km/h)`
      );
    }
    load();
  }, [selectedId, load]);

  useEffect(() => {
    if (!autoDrive) return;
    const id = setInterval(() => {
      simulateStep();
    }, 2500);
    return () => clearInterval(id);
  }, [autoDrive, simulateStep]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Vehicle Operator Console</h1>
      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Live GPS Telemetry & Route Simulator</h2>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.registrationNumber} — {v.name} ({v.status})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateGps(Number(lng), Number(lat))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white"
            >
              <Navigation className="h-4 w-4" /> Update Coordinates
            </button>
            <button
              onClick={() =>
                navigator.geolocation?.getCurrentPosition((p) =>
                  updateGps(Number(p.coords.longitude.toFixed(6)), Number(p.coords.latitude.toFixed(6)))
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <LocateFixed className="h-4 w-4 text-sky-600" /> Device GPS
            </button>
            <button
              onClick={simulateStep}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800"
            >
              <StepForward className="h-4 w-4" /> Simulate Step
            </button>
            <button
              onClick={() => setAutoDrive((d) => !d)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white ${
                autoDrive ? 'bg-amber-600' : 'bg-teal-600'
              }`}
            >
              {autoDrive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoDrive ? 'Stop Auto-Drive' : 'Auto-Drive Route'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Assigned Vehicle Routes ({tasks.length})</h2>
          <div className="space-y-2 text-xs">
            {tasks.map((t) => (
              <div key={t._id} className="rounded-lg bg-slate-50 p-3">
                <span className="font-mono font-bold">{t.taskCode}</span> · {t.complaintId?.title} (
                {t.complaintId?.address}) — <strong className="capitalize">{t.status}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
