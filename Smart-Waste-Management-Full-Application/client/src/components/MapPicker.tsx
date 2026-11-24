import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { createLocationPickerIcon, MAP_TILE_LAYERS } from '../utils/mapIcons';

const pinIcon = createLocationPickerIcon();

function ClickHandler({ onPick }: { onPick: (lng: number, lat: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6)));
    }
  });
  return null;
}

export function MapPicker({
  coordinates,
  onChange
}: {
  coordinates: [number, number];
  onChange: (coords: [number, number]) => void;
}) {
  const [lng, lat] = coordinates;
  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner">
      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution={MAP_TILE_LAYERS.voyager.attribution}
          url={MAP_TILE_LAYERS.voyager.url}
        />
        <ClickHandler onPick={(newLng, newLat) => onChange([newLng, newLat])} />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
