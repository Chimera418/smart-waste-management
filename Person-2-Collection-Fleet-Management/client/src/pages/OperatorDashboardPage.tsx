import { useEffect, useState } from 'react';
import { LocateFixed, Navigation } from 'lucide-react';
import api from '../services/api';
import type { Vehicle } from '../types';

export function OperatorDashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [lng, setLng] = useState('77.5946');
  const [lat, setLat] = useState('12.9716');
  const [message, setMessage] = useState('');

  const loadVehicles = async () => {
    const res = await api.get('/vehicles');
    const list: Vehicle[] = res.data.data || [];
    setVehicles(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0]._id);
      setLng(String(list[0].currentLocation.coordinates[0]));
      setLat(String(list[0].currentLocation.coordinates[1]));
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const pushCoordinates = async (newLng: number, newLat: number) => {
    if (!selectedId) return;
    await api.patch(`/vehicles/${selectedId}/location`, {
      coordinates: [newLng, newLat],
      speedKmh: 28,
      heading: 90
    });
    setMessage(`Updated GPS to [${newLng}, ${newLat}]`);
    loadVehicles();
  };

  const handleBrowserGps = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const newLng = Number(pos.coords.longitude.toFixed(6));
      const newLat = Number(pos.coords.latitude.toFixed(6));
      setLng(String(newLng));
      setLat(String(newLat));
      pushCoordinates(newLng, newLat);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vehicle Operator GPS Console</h1>
        <p className="text-sm text-slate-600">
          Broadcast live vehicle coordinates to the municipal OpenStreetMap tracking board.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Select Vehicle</label>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Longitude</label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => pushCoordinates(Number(lng), Number(lat))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Navigation className="h-4 w-4" />
            Update GPS Location
          </button>
          <button
            onClick={handleBrowserGps}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LocateFixed className="h-4 w-4 text-sky-600" />
            Use Device GPS
          </button>
        </div>
      </div>
    </div>
  );
}
