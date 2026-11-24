import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Plus } from 'lucide-react';
import api from '../services/api';

export function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [progress, setProgress] = useState<any | null>(null);

  const load = () => api.get('/zones').then((res) => setZones(res.data.data || []));
  useEffect(() => {
    load();
  }, []);

  const createZone = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/zones', {
      name,
      code,
      wardNumber,
      centerCoordinates: [77.595, 12.972],
      boundaryCoordinates: [[[77.58, 12.96], [77.61, 12.96], [77.61, 12.99], [77.58, 12.99], [77.58, 12.96]]]
    });
    setName('');
    setCode('');
    setWardNumber('');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Geospatial Boundaries
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Ward Collection Zones</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          GeoJSON polygon boundaries used for automatic complaint routing and ward SLA tracking.
        </p>
      </div>

      <form onSubmit={createZone} className="civic-card grid gap-3 p-5 sm:grid-cols-4 sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Zone Name</label>
          <input required placeholder="North Ward" value={name} onChange={(e) => setName(e.target.value)} className="civic-input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Zone Code</label>
          <input required placeholder="ZN-NORTH" value={code} onChange={(e) => setCode(e.target.value)} className="civic-input font-mono" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#141917]">Ward Number</label>
          <input placeholder="Ward 45" value={wardNumber} onChange={(e) => setWardNumber(e.target.value)} className="civic-input" />
        </div>
        <button className="civic-btn-primary h-[38px]">
          <Plus className="h-4 w-4" /> Create Zone
        </button>
      </form>

      {progress && (
        <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-sm text-[#065F46] tabular-nums">
          <strong>{progress.zoneName}:</strong> {progress.resolvedComplaints}/{progress.totalComplaints} complaints
          resolved · {progress.completedTasks}/{progress.totalTasks} tasks completed · {progress.totalCollectedKg} kg
          collected
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {zones.map((z) => (
          <div key={z._id} className="civic-card p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#14533C]">
                <MapPin className="h-3.5 w-3.5" /> {z.code}
              </span>
              <button
                onClick={async () => setProgress((await api.get(`/zones/${z._id}/progress`)).data.data)}
                className="text-xs font-semibold text-[#14533C] hover:underline"
              >
                Inspect Progress →
              </button>
            </div>
            <h3 className="mt-2 text-base font-bold text-[#141917]">{z.name}</h3>
            <p className="mt-0.5 text-xs text-[#5C6460]">{z.wardNumber}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
