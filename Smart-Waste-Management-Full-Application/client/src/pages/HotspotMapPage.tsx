import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import api from '../services/api';
import { MAP_TILE_LAYERS } from '../utils/mapIcons';

export function HotspotMapPage() {
  const [data, setData] = useState<{ hotspots: any[]; zones: any[] }>({ hotspots: [], zones: [] });

  useEffect(() => {
    api.get('/analytics/hotspots').then((res) => setData(res.data.data));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Geospatial Hotspot Analysis</h1>
        <p className="text-sm text-slate-600">
          Live municipal complaint density clusters overlaid on active ward collection boundaries.
        </p>
      </div>
      <div className="h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <MapContainer center={[12.968, 77.6]} zoom={12} className="h-full w-full">
          <TileLayer attribution={MAP_TILE_LAYERS.voyager.attribution} url={MAP_TILE_LAYERS.voyager.url} />
          {data.zones.map((z) => (
            <Polygon
              key={z._id}
              positions={(z.boundary?.coordinates?.[0] || []).map(([lng, lat]: [number, number]) => [lat, lng])}
              pathOptions={{ color: '#4f46e5', weight: 1.5, dashArray: '4 4', fillOpacity: 0.06 }}
            />
          ))}
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
                Complaints: {h.count} (Active: {h.activeCount})
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
