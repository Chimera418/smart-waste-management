import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0f766e;border:3px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#ffffff;"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function ClickHandler({ onPick }: { onPick: (lng: number, lat: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6)));
    }
  });
  return null;
}

interface MapPickerProps {
  coordinates: [number, number];
  onChange: (coords: [number, number]) => void;
}

export function MapPicker({ coordinates, onChange }: MapPickerProps) {
  const [lng, lat] = coordinates;

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner">
      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(newLng, newLat) => onChange([newLng, newLat])} />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
