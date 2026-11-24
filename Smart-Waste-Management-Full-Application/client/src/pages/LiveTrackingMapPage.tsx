import { Fragment, useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Compass, Layers, Pause, Play, Radio, StepForward, Truck } from 'lucide-react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../context/AuthContext';
import {
  createComplaintMarkerIcon,
  createVehicleMarkerIcon,
  MAP_TILE_LAYERS,
  type MapStyleKey
} from '../utils/mapIcons';

function MapFocusController({ focusCoords }: { focusCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focusCoords) return;
    map.flyTo(focusCoords, Math.max(map.getZoom(), 14), { duration: 0.9 });
  }, [map, focusCoords]);
  return null;
}

export function LiveTrackingMapPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    vehicles: any[];
    activeComplaints: any[];
    zones: any[];
    activeTasks: any[];
    simulation?: { running: boolean; paused: boolean; lastStepAt: string | null };
  }>({
    vehicles: [],
    activeComplaints: [],
    zones: [],
    activeTasks: [],
    simulation: { running: true, paused: false, lastStepAt: null }
  });
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('voyager');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [lastEvents, setLastEvents] = useState<string[]>([]);
  const [stepping, setStepping] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/vehicles/tracking');
      setData(res.data.data);
    } catch {
      // Ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Continuous live polling (backend auto-simulates every ~1.2s automatically)
  usePolling(load, 1200, true);

  const toggleSimulation = async () => {
    const currentlyRunning = data.simulation?.running ?? true;
    await api.post('/vehicles/simulation-toggle', { paused: currentlyRunning });
    await load();
  };

  const runSimulationStep = useCallback(async () => {
    if (stepping) return;
    setStepping(true);
    try {
      const res = await api.post('/vehicles/simulate-step', {});
      const events: any[] = res.data.data.milestoneEvents || [];
      if (events.length > 0) {
        setLastEvents((prev) =>
          [
            ...events.map(
              (e) => `${e.taskCode}: ${e.milestone.toUpperCase()} (${e.complaintCode}) — Push & Email dispatched`
            ),
            ...prev
          ].slice(0, 5)
        );
      }
      await load();
    } finally {
      setStepping(false);
    }
  }, [load, stepping]);

  const canSimulate = user?.role === 'admin' || user?.role === 'vehicle_operator';
  const isRunning = data.simulation?.running ?? true;
  const activeLayer = MAP_TILE_LAYERS[mapStyle];
  const enRouteCount = data.activeTasks.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Live GPS Fleet Operations Map</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                isRunning
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              }`}
            >
              <Radio className={`h-3 w-3 ${isRunning ? 'animate-pulse' : ''}`} />
              {isRunning ? 'AUTO-SIMULATION LIVE' : 'SIMULATION PAUSED'}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Always-on municipal fleet telemetry with directional vehicle tracking, live route corridors, and automated citizen email/push alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            <Layers className="ml-2 mr-1 h-3.5 w-3.5 text-slate-400" />
            {(Object.keys(MAP_TILE_LAYERS) as MapStyleKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setMapStyle(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  mapStyle === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {MAP_TILE_LAYERS[key].label}
              </button>
            ))}
          </div>

          {canSimulate && (
            <>
              <button
                onClick={toggleSimulation}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-xs ${
                  isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={runSimulationStep}
                disabled={stepping}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <StepForward className="h-3.5 w-3.5 text-sky-600" />
                Step Now
              </button>
            </>
          )}
        </div>
      </div>

      {lastEvents.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
          <p className="mb-1 font-semibold">Latest Milestone Notifications & Emails Dispatched:</p>
          <ul className="space-y-0.5">
            {lastEvents.map((ev, i) => (
              <li key={i}>• {ev}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="relative h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm lg:col-span-8">
          {/* Floating Live Telemetry HUD */}
          <div className="pointer-events-none absolute left-3 top-3 z-[400] flex flex-wrap gap-2">
            <div className="rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur">
              <span className="text-slate-400">Active Fleet:</span>{' '}
              <strong className="text-emerald-400">{data.vehicles.length}</strong>
            </div>
            <div className="rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur">
              <span className="text-slate-400">En Route Tasks:</span>{' '}
              <strong className="text-sky-400">{enRouteCount}</strong>
            </div>
            <div className="rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur">
              <span className="text-slate-400">Open Complaints:</span>{' '}
              <strong className="text-rose-400">{data.activeComplaints.length}</strong>
            </div>
          </div>

          <MapContainer center={[12.968, 77.6]} zoom={12} className="h-full w-full">
            <TileLayer attribution={activeLayer.attribution} url={activeLayer.url} />
            <MapFocusController focusCoords={focusCoords} />

            {data.zones.map((z) => (
              <Polygon
                key={z._id}
                positions={(z.boundary?.coordinates?.[0] || []).map(([lng, lat]: [number, number]) => [lat, lng])}
                pathOptions={{
                  color: mapStyle === 'dark' ? '#14b8a6' : '#0f766e',
                  weight: 1.5,
                  dashArray: '4 4',
                  fillOpacity: mapStyle === 'dark' ? 0.1 : 0.06
                }}
              >
                <Popup>
                  <strong>{z.name}</strong> ({z.code})
                </Popup>
              </Polygon>
            ))}

            {data.vehicles.map((v) => {
              const trail = (v.locationHistory || []).slice(-10).map(
                (pt: any) => [pt.coordinates[1], pt.coordinates[0]] as [number, number]
              );
              const latest = v.locationHistory?.[v.locationHistory.length - 1];
              const task = data.activeTasks.find((t) => t.assignedVehicleId === v._id);
              const icon = createVehicleMarkerIcon({
                type: v.type,
                registrationNumber: v.registrationNumber,
                heading: latest?.heading ?? 0,
                speedKmh: latest?.speedKmh ?? 0,
                isEnRoute: Boolean(task),
                selected: selectedVehicleId === v._id
              });

              return (
                <Fragment key={v._id}>
                  {trail.length > 1 && (
                    <Polyline
                      positions={trail}
                      pathOptions={{
                        color: task ? '#0ea5e9' : '#14b8a6',
                        weight: task ? 3.5 : 2.5,
                        opacity: 0.72
                      }}
                    />
                  )}
                  <Marker
                    position={[v.currentLocation.coordinates[1], v.currentLocation.coordinates[0]]}
                    icon={icon}
                    eventHandlers={{ click: () => setSelectedVehicleId(v._id) }}
                  >
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-mono font-bold text-slate-900">{v.registrationNumber}</p>
                        <p className="text-slate-700">
                          {v.name} · <span className="capitalize">{v.type.replace('_', ' ')}</span>
                        </p>
                        <p className="text-slate-600">
                          Speed: <strong>{latest?.speedKmh ?? 0} km/h</strong> · Heading:{' '}
                          <strong>{latest?.heading ?? 0}°</strong>
                        </p>
                        {task && (
                          <p className="rounded bg-sky-50 px-2 py-1 font-semibold text-sky-800">
                            {task.taskCode} → {task.complaintId?.complaintCode} (
                            {task.distanceKm === 0 ? 'Arrived!' : `${task.distanceKm} km · ~${task.etaMinutes}m`})
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              );
            })}

            {data.activeTasks.map((t) => {
              const v = data.vehicles.find((veh) => veh._id === t.assignedVehicleId);
              const cLoc = t.complaintId?.location?.coordinates;
              const vLoc = v?.currentLocation?.coordinates;
              if (!cLoc || !vLoc) return null;
              return (
                <Polyline
                  key={t._id}
                  positions={[
                    [vLoc[1], vLoc[0]],
                    [cLoc[1], cLoc[0]]
                  ]}
                  pathOptions={{ color: '#f59e0b', weight: 2.5, dashArray: '8 6', opacity: 0.9 }}
                />
              );
            })}

            {data.activeComplaints.map((c) => (
              <Marker
                key={c._id}
                position={[c.location.coordinates[1], c.location.coordinates[0]]}
                icon={createComplaintMarkerIcon({
                  priority: c.priority,
                  wasteCategory: c.wasteCategory,
                  code: c.complaintCode,
                  showLabel: c.priority === 'critical' || c.priority === 'high'
                })}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <p className="font-mono font-bold text-slate-900">{c.complaintCode}</p>
                    <p className="font-semibold text-slate-800">{c.title}</p>
                    <p className="text-slate-600">{c.address}</p>
                    <p className="capitalize text-slate-500">
                      {c.wasteCategory} · <strong>{c.priority}</strong> priority · {c.status.replace('_', ' ')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-lg bg-white/92 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-md backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal-700" /> Garbage Truck
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> E-Auto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-600" /> Tipper Truck
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-600" /> Hazmat Van
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Critical Pin
            </span>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Truck className="h-4 w-4 text-teal-600" />
              Active Fleet Telemetry ({data.vehicles.length})
            </h2>
            <span className="text-[11px] text-slate-400">Click to focus</span>
          </div>
          <div className="max-h-[490px] space-y-2.5 overflow-y-auto pr-1 text-xs">
            {data.vehicles.map((v) => {
              const task = data.activeTasks.find((t) => t.assignedVehicleId === v._id);
              const latest = v.locationHistory?.[v.locationHistory.length - 1];
              const isSelected = selectedVehicleId === v._id;
              return (
                <button
                  key={v._id}
                  onClick={() => {
                    setSelectedVehicleId(v._id);
                    setFocusCoords([v.currentLocation.coordinates[1], v.currentLocation.coordinates[0]]);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 ring-1 ring-sky-200'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5 font-mono text-sky-800">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          (latest?.speedKmh ?? 0) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      {v.registrationNumber}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700 ring-1 ring-slate-200">
                      {v.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-slate-800">{v.name}</p>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-slate-500">
                    <span>
                      {v.currentLocation.coordinates[1].toFixed(4)}, {v.currentLocation.coordinates[0].toFixed(4)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <Compass className="h-3 w-3 text-teal-600" />
                      {latest?.speedKmh ?? 0} km/h · {latest?.heading ?? 0}°
                    </span>
                  </div>
                  {task && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/70">
                      {task.taskCode} → {task.complaintId?.complaintCode} ·{' '}
                      {task.distanceKm === 0 ? 'Arrived On-Site!' : `${task.distanceKm} km (~${task.etaMinutes}m ETA)`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
