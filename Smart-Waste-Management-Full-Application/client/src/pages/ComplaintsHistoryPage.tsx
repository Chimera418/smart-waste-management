import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, Gauge, Layers, Navigation, Radio, Truck } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { usePolling } from '../hooks/usePolling';
import {
  createComplaintMarkerIcon,
  createVehicleMarkerIcon,
  MAP_TILE_LAYERS,
  type MapStyleKey
} from '../utils/mapIcons';

function FitBoundsController({
  vehiclePos,
  complaintPos
}: {
  vehiclePos: [number, number];
  complaintPos: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([vehiclePos, complaintPos]);
    map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15, animate: true });
  }, [map, vehiclePos[0], vehiclePos[1], complaintPos[0], complaintPos[1]]);
  return null;
}

export function ComplaintsHistoryPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<any | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('voyager');

  const loadComplaints = useCallback(async () => {
    try {
      const res = await api.get('/complaints');
      const list: any[] = res.data.data || [];
      setComplaints(list);
      setSelectedId((prev) => {
        if (prev) return prev;
        const activeTracked = list.find(
          (c) => c.assignedTaskId && !['resolved', 'rejected'].includes(c.status)
        );
        return (activeTracked || list[0])?._id || null;
      });
    } catch {
      // Ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  usePolling(loadComplaints, 3000, true);

  const selected = complaints.find((c) => c._id === selectedId) || null;

  const loadTracking = useCallback(async () => {
    if (!selectedId) {
      setTracking(null);
      return;
    }
    try {
      const res = await api.get(`/complaints/${selectedId}/tracking`);
      setTracking(res.data.data);
    } catch {
      // Ignore transient poll errors
    }
  }, [selectedId]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  usePolling(loadTracking, 1000, Boolean(selectedId));

  const vehicle = tracking?.vehicle;
  const vCoords: [number, number] | null = vehicle?.currentLocation?.coordinates
    ? [vehicle.currentLocation.coordinates[1], vehicle.currentLocation.coordinates[0]]
    : null;
  const cCoords: [number, number] | null = selected?.location?.coordinates
    ? [selected.location.coordinates[1], selected.location.coordinates[0]]
    : null;
  const traveledTrail: [number, number][] = (vehicle?.locationHistory || []).map((pt: any) => [
    pt.coordinates[1],
    pt.coordinates[0]
  ]);
  const milestones: string[] = tracking?.milestonesNotified || [];
  const activeLayer = MAP_TILE_LAYERS[mapStyle];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Complaints & Live Vehicle Tracking</h1>
          <p className="text-sm text-slate-600">
            Watch your assigned collection truck glide toward your location live as the simulation runs continuously.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> Live GPS Auto-Tracking (1s)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white lg:col-span-5">
          {complaints.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No complaints submitted yet.</div>
          ) : (
            complaints.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedId(c._id)}
                className={`flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 ${
                  selectedId === c._id ? 'bg-teal-50/70' : ''
                }`}
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-500">{c.complaintCode}</p>
                  <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.address}
                    {c.assignedTaskId?.assignedVehicleId?.registrationNumber && (
                      <span className="ml-1.5 font-mono font-semibold text-sky-700">
                        · {c.assignedTaskId.assignedVehicleId.registrationNumber}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge value={c.status} />
              </button>
            ))
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          {!selected ? (
            <p className="text-sm text-slate-500">
              Select a complaint to inspect its live status timeline and track the assigned vehicle.
            </p>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between">
                <span className="font-mono font-bold text-teal-700">{selected.complaintCode}</span>
                <StatusBadge value={selected.status} />
              </div>
              <h2 className="text-base font-bold text-slate-900">{selected.title}</h2>
              <p className="text-slate-600">{selected.description}</p>

              {vCoords && cCoords ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-white">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                        <Truck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-white">
                          {vehicle.name}{' '}
                          <span className="font-mono text-teal-300">({vehicle.registrationNumber})</span>
                        </p>
                        <p className="text-[11px] text-slate-300">
                          {tracking.task?.assignedWorkerId?.userId?.name
                            ? `Crew: ${tracking.task.assignedWorkerId.userId.name}`
                            : 'Municipal Collection Unit'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        {tracking.distanceKm === 0
                          ? 'Arrived On-Site'
                          : `~${tracking.etaMinutes} min ETA`}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {tracking.distanceKm === 0 ? 'Clearing Waste' : `${tracking.distanceKm} km away`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700">
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                        <Gauge className="h-3.5 w-3.5 text-sky-600" />
                        Speed: <strong>{tracking.speedKmh ?? 0} km/h</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                        <Navigation className="h-3.5 w-3.5 text-teal-600" />
                        Heading: <strong>{tracking.heading ?? 0}°</strong>
                      </span>
                    </div>

                    <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                      <Layers className="ml-1.5 mr-1 h-3 w-3 text-slate-400" />
                      {(['voyager', 'dark'] as MapStyleKey[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => setMapStyle(key)}
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            mapStyle === key ? 'bg-slate-900 text-white' : 'text-slate-600'
                          }`}
                        >
                          {MAP_TILE_LAYERS[key].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {[
                      { label: 'Assigned', active: true },
                      { label: 'En Route', active: milestones.includes('departed') || tracking.distanceKm === 0 },
                      { label: 'Approaching', active: milestones.includes('approaching') || tracking.distanceKm === 0 },
                      { label: 'Arrived', active: milestones.includes('arrived') || tracking.distanceKm === 0 },
                      { label: 'Resolved', active: selected.status === 'resolved' }
                    ].map((step) => (
                      <span
                        key={step.label}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                          step.active
                            ? 'bg-teal-600 text-white'
                            : 'bg-white text-slate-400 ring-1 ring-slate-200'
                        }`}
                      >
                        {step.active && <CheckCircle2 className="h-3 w-3" />}
                        {step.label}
                      </span>
                    ))}
                  </div>

                  <div className="h-72 overflow-hidden rounded-xl border border-slate-200 shadow-inner">
                    <MapContainer center={vCoords} zoom={14} className="h-full w-full">
                      <TileLayer attribution={activeLayer.attribution} url={activeLayer.url} />
                      <FitBoundsController vehiclePos={vCoords} complaintPos={cCoords} />
                      {traveledTrail.length > 1 && (
                        <Polyline
                          positions={traveledTrail}
                          pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.8 }}
                        />
                      )}
                      <Polyline
                        positions={[vCoords, cCoords]}
                        pathOptions={{ color: '#f59e0b', dashArray: '8 6', weight: 3, opacity: 0.9 }}
                      />
                      <Marker
                        position={vCoords}
                        icon={createVehicleMarkerIcon({
                          type: vehicle.type,
                          registrationNumber: vehicle.registrationNumber,
                          heading: tracking.heading ?? 0,
                          speedKmh: tracking.speedKmh ?? 0,
                          isEnRoute: tracking.distanceKm !== 0,
                          selected: true
                        })}
                      >
                        <Popup>
                          <strong>{vehicle.registrationNumber}</strong> ({tracking.speedKmh ?? 0} km/h)
                          <br />
                          {tracking.distanceKm === 0 ? 'Arrived at your location!' : `${tracking.distanceKm} km away`}
                        </Popup>
                      </Marker>
                      <Marker
                        position={cCoords}
                        icon={createComplaintMarkerIcon({
                          priority: selected.priority,
                          wasteCategory: selected.wasteCategory,
                          code: selected.complaintCode,
                          showLabel: true
                        })}
                      >
                        <Popup>
                          <strong>Your Complaint ({selected.complaintCode})</strong>
                          <br />
                          {selected.address}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-700" /> Assigned{' '}
                      <span className="capitalize">
                        {vehicle.type === 'e_rickshaw' ? 'E-Auto' : vehicle.type.replace('_', ' ')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" /> Complaint Pin
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 bg-sky-500" /> Path Traveled
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-500" /> Approaching Route
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  No collection vehicle assigned yet. Once an administrator dispatches a crew, live map tracking will appear here automatically.
                </div>
              )}

              <ol className="space-y-2 border-l-2 border-teal-200 pl-3">
                {(selected.statusHistory || []).map((s: any, i: number) => (
                  <li key={i}>
                    <strong className="capitalize">{s.status.replace('_', ' ')}</strong> ·{' '}
                    {new Date(s.changedAt).toLocaleString()}
                    {s.note && <p className="text-slate-600">{s.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
