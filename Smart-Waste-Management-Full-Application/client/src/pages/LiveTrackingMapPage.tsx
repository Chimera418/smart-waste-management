import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';

const vehicleIcon = L.divIcon({
  className: 'vehicle-pin',
  html: `<div style="width:26px;height:26px;border-radius:8px;background:#0284c7;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">V</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const complaintIcon = L.divIcon({
  className: 'complaint-pin',
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:#dc2626;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export function LiveTrackingMapPage() {
  const [data, setData] = useState<{ vehicles: any[]; activeComplaints: any[]; zones: any[] }>({
    vehicles: [],
    activeComplaints: [],
    zones: []
  });

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

  usePolling(load, 5000, true);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live GPS Fleet & Complaint Map</h1>
        <p className="text-sm text-slate-600">Polls every 5s via OpenStreetMap & MongoDB geospatial coordinates.</p>
      </div>
      <div className="h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <MapContainer center={[12.968, 77.6]} zoom={12} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.zones.map((z) => (
            <Polygon
              key={z._id}
              positions={(z.boundary?.coordinates?.[0] || []).map(([lng, lat]: [number, number]) => [lat, lng])}
              pathOptions={{ color: '#0f766e', fillOpacity: 0.08 }}
            >
              <Popup>{z.name}</Popup>
            </Polygon>
          ))}
          {data.vehicles.map((v) => (
            <Marker key={v._id} position={[v.currentLocation.coordinates[1], v.currentLocation.coordinates[0]]} icon={vehicleIcon}>
              <Popup>
                <strong>{v.registrationNumber}</strong> ({v.status})
              </Popup>
            </Marker>
          ))}
          {data.activeComplaints.map((c) => (
            <Marker key={c._id} position={[c.location.coordinates[1], c.location.coordinates[0]]} icon={complaintIcon}>
              <Popup>
                <strong>{c.complaintCode}</strong>: {c.title} ({c.status})
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
