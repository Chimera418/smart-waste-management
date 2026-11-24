import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import api from '../services/api';

export function HotspotMapPage() {
  const [data, setData] = useState<{ hotspots: any[]; zones: any[]; zoneDensity: any[] }>({
    hotspots: [],
    zones: [],
    zoneDensity: []
  });

  useEffect(() => {
    api.get('/analytics/hotspots').then((res) => setData(res.data.data));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Geospatial Hotspot Analysis</h1>
        <p className="text-sm text-slate-600">
          MongoDB spatial clustering highlighting high-concentration waste complaint hotspots.
        </p>
      </div>

      <div className="h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <MapContainer center={[12.9716, 77.5946]} zoom={12} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.zones.map((z) => {
            const pos = (z.boundary?.coordinates?.[0] || []).map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            );
            return <Polygon key={z._id} positions={pos} pathOptions={{ color: '#4f46e5', fillOpacity: 0.06 }} />;
          })}
          {data.hotspots.map((h, i) => (
            <CircleMarker
              key={i}
              center={[h.lat, h.lng]}
              radius={Math.min(28, 10 + h.count * 4)}
              pathOptions={{
                color: h.severity === 'high' ? '#dc2626' : h.severity === 'medium' ? '#d97706' : '#0284c7',
                fillOpacity: 0.45
              }}
            >
              <Popup>
                <strong>Hotspot Cluster</strong>
                <br />
                Total Complaints: {h.count} (Active: {h.activeCount})
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
