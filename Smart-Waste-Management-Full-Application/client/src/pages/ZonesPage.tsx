import { useEffect, useState, type FormEvent } from 'react';
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
      <h1 className="text-2xl font-bold text-slate-900">Geographical Collection Zones</h1>
      <form onSubmit={createZone} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <input required placeholder="Zone Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input required placeholder="Code (ZN-NORTH)" value={code} onChange={(e) => setCode(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Ward" value={wardNumber} onChange={(e) => setWardNumber(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Create Zone</button>
      </form>
      {progress && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          <strong>{progress.zoneName}:</strong> {progress.resolvedComplaints}/{progress.totalComplaints} complaints resolved · {progress.completedTasks}/{progress.totalTasks} tasks completed · {progress.totalCollectedKg} kg collected
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {zones.map((z) => (
          <div key={z._id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <span className="font-mono text-xs font-bold text-teal-700">{z.code}</span>
              <button
                onClick={async () => setProgress((await api.get(`/zones/${z._id}/progress`)).data.data)}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Progress
              </button>
            </div>
            <h3 className="mt-1 font-semibold">{z.name}</h3>
            <p className="text-xs text-slate-500">{z.wardNumber}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
