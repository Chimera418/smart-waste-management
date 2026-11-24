import L from 'leaflet';

export type MapStyleKey = 'voyager' | 'dark' | 'light' | 'osm';

const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY || '').trim();
const CARTO_QUERY = CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : '';

export const MAP_TILE_LAYERS: Record<
  MapStyleKey,
  { label: string; url: string; attribution: string }
> = {
  voyager: {
    label: 'Civic Map',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  dark: {
    label: 'Dark Ops',
    url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  light: {
    label: 'Positron',
    url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  osm: {
    label: 'Street OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

function getVehiclePalette(type: string, isEnRoute: boolean) {
  if (type === 'e_rickshaw') {
    return {
      ring: 'rgba(16, 185, 129, 0.42)',
      badgeBg: '#065f46',
      label: 'E-Auto'
    };
  }
  if (type === 'hazmat_van') {
    return {
      ring: 'rgba(234, 88, 12, 0.48)',
      badgeBg: '#9a3412',
      label: 'Hazmat Van'
    };
  }
  if (type === 'tipper') {
    return {
      ring: 'rgba(2, 132, 199, 0.45)',
      badgeBg: '#0c4a6e',
      label: 'Tipper'
    };
  }
  if (type === 'mini_truck') {
    return {
      ring: 'rgba(37, 99, 235, 0.45)',
      badgeBg: '#1e3a8a',
      label: 'Mini Truck'
    };
  }
  return {
    ring: isEnRoute ? 'rgba(14, 165, 233, 0.5)' : 'rgba(15, 118, 110, 0.42)',
    badgeBg: '#0f172a',
    label: 'Truck'
  };
}

/**
 * Distinct, realistic side-profile vehicle illustrations facing right (flipped left when heading west):
 * - e_rickshaw -> Iconic Indian Auto-Rickshaw / E-Auto waste collector
 * - compactor -> Heavy Municipal Garbage Compactor Truck
 * - tipper -> Open-bed Hydraulic Dump / Tipper Truck
 * - hazmat_van -> Sealed Orange Hazmat Response Van with warning beacon
 * - mini_truck -> Compact Urban Mini Pickup Truck
 */
function renderVehicleProfileSvg(type: string, isMoving: boolean) {
  const beacon = isMoving ? '#facc15' : '#94a3b8';

  if (type === 'e_rickshaw') {
    // Classic 3-Wheeler Auto-Rickshaw / E-Auto with green-yellow canopy & rear waste loader
    return `
      <svg width="44" height="32" viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Rear waste bin hopper -->
        <rect x="3" y="12" width="12" height="11" rx="2" fill="#059669" stroke="#ffffff" stroke-width="1.3"/>
        <line x1="6" y1="15" x2="12" y2="15" stroke="#a7f3d0" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="6" y1="18.5" x2="12" y2="18.5" stroke="#a7f3d0" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Iconic auto curved yellow-green canopy -->
        <path d="M14 7.5 C16 4.8 28 4.8 31.5 8 L35 14.5 L14 14.5 Z" fill="#facc15" stroke="#ffffff" stroke-width="1.2"/>
        <!-- Windshield -->
        <path d="M27.5 8.5 L31 8.5 L34.2 14.5 L28 14.5 Z" fill="#bae6fd"/>
        <!-- Driver cabin body -->
        <path d="M14 14.5 H35.5 L38.5 18.5 C39.3 19.6 39 23 37 23.5 H14 Z" fill="#047857" stroke="#ffffff" stroke-width="1.3"/>
        <!-- Yellow auto waist stripe -->
        <rect x="15" y="17.5" width="22.5" height="2.4" rx="1" fill="#fde047"/>
        <!-- Headlight -->
        <circle cx="38.2" cy="19.5" r="1.6" fill="#fef08a" stroke="#ffffff" stroke-width="0.7"/>
        <!-- Rear wheel & iconic front single auto wheel + mudguard -->
        <circle cx="11.5" cy="24.5" r="4" fill="#1e293b" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="11.5" cy="24.5" r="1.5" fill="#cbd5e1"/>
        <circle cx="34.5" cy="24.5" r="3.7" fill="#1e293b" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="34.5" cy="24.5" r="1.4" fill="#cbd5e1"/>
      </svg>`;
  }

  if (type === 'hazmat_van') {
    // High-visibility Orange Hazmat Response Van with roof lightbar & hazard triangle
    return `
      <svg width="46" height="32" viewBox="0 0 46 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Roof emergency beacon -->
        <rect x="24" y="4.2" width="6" height="2.8" rx="1.2" fill="${beacon}" stroke="#ffffff" stroke-width="0.8"/>
        <!-- Main enclosed van body -->
        <path d="M4 9.5 C4 7.8 5.4 6.8 7 6.8 H29.5 C31.5 6.8 33.5 8 35 10.5 L39 14.5 H41 C42.2 14.5 43 15.5 43 16.8 V22.5 C43 23.5 42.2 24 41 24 H5.5 C4.5 24 4 23.3 4 22.3 Z" fill="#ea580c" stroke="#ffffff" stroke-width="1.4"/>
        <!-- Cab windshield -->
        <path d="M29.5 9 H33.5 L37.2 14.2 H29.5 Z" fill="#e0f2fe"/>
        <!-- Hazard high-vis stripe -->
        <rect x="5" y="18.2" width="36.5" height="2.6" fill="#fde047"/>
        <!-- Warning triangle badge on side -->
        <polygon points="16.5,9.5 21.5,17 11.5,17" fill="#fef08a" stroke="#7c2d12" stroke-width="0.9"/>
        <rect x="15.9" y="12" width="1.2" height="2.6" fill="#7c2d12"/>
        <circle cx="16.5" cy="15.6" r="0.7" fill="#7c2d12"/>
        <!-- Headlight -->
        <rect x="40.8" y="16.8" width="2" height="2.2" rx="0.6" fill="#fef08a"/>
        <!-- Wheels -->
        <circle cx="12.5" cy="24.5" r="4.1" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="12.5" cy="24.5" r="1.6" fill="#cbd5e1"/>
        <circle cx="34.5" cy="24.5" r="4.1" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="34.5" cy="24.5" r="1.6" fill="#cbd5e1"/>
      </svg>`;
  }

  if (type === 'tipper') {
    // Sky-Blue Dump / Tipper Truck with angled dump bed & cab
    return `
      <svg width="48" height="34" viewBox="0 0 48 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Angled open tipper dump bed -->
        <path d="M3 10 L27 7.5 L28 20.5 L5.5 21.5 Z" fill="#0284c7" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
        <!-- Bed structural ribs -->
        <line x1="10" y1="9.5" x2="11" y2="21" stroke="#7dd3fc" stroke-width="1.3"/>
        <line x1="18" y1="8.7" x2="19" y2="20.7" stroke="#7dd3fc" stroke-width="1.3"/>
        <!-- Chassis beam -->
        <rect x="6" y="21" width="36" height="3.2" rx="1" fill="#334155"/>
        <!-- Forward truck cab -->
        <path d="M29.5 9.5 H38 C39.5 9.5 40.8 10.6 41.5 12.2 L43.5 16.5 V22.5 C43.5 23.4 42.8 24 41.8 24 H29.5 Z" fill="#0369a1" stroke="#ffffff" stroke-width="1.4"/>
        <!-- Cab windshield -->
        <path d="M32 11.5 H38.2 L40.8 16 H32 Z" fill="#e0f2fe"/>
        <!-- Roof beacon -->
        <circle cx="33.5" cy="8.2" r="1.9" fill="${beacon}" stroke="#ffffff" stroke-width="0.8"/>
        <!-- Heavy dual tires -->
        <circle cx="12.5" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="12.5" cy="25.2" r="1.7" fill="#cbd5e1"/>
        <circle cx="22" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="22" cy="25.2" r="1.7" fill="#cbd5e1"/>
        <circle cx="37" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="37" cy="25.2" r="1.7" fill="#cbd5e1"/>
      </svg>`;
  }

  if (type === 'mini_truck') {
    // Compact Urban Mini Pickup Truck (Tata Ace / Civic Mini Loader)
    return `
      <svg width="44" height="32" viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Rear open cargo bed -->
        <rect x="4" y="13.5" width="21" height="9" rx="1.8" fill="#2563eb" stroke="#ffffff" stroke-width="1.3"/>
        <line x1="10.5" y1="14.5" x2="10.5" y2="21.5" stroke="#93c5fd" stroke-width="1.2"/>
        <line x1="17.5" y1="14.5" x2="17.5" y2="21.5" stroke="#93c5fd" stroke-width="1.2"/>
        <!-- Compact cab -->
        <path d="M26 9.2 H34.5 C36 9.2 37.2 10.2 38 11.8 L40 16 V22.5 C40 23.2 39.4 23.8 38.5 23.8 H26 Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.3"/>
        <path d="M28.5 11.2 H34.5 L37.2 15.5 H28.5 Z" fill="#e0f2fe"/>
        <rect x="38.2" y="17.8" width="1.8" height="2.2" rx="0.5" fill="#fef08a"/>
        <!-- Wheels -->
        <circle cx="11.5" cy="24.2" r="3.9" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="11.5" cy="24.2" r="1.5" fill="#cbd5e1"/>
        <circle cx="33.5" cy="24.2" r="3.9" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="33.5" cy="24.2" r="1.5" fill="#cbd5e1"/>
      </svg>`;
  }

  // Default: Heavy Municipal Garbage Compactor Truck
  return `
    <svg width="50" height="34" viewBox="0 0 50 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Rear angled waste compactor hopper -->
      <path d="M3 10.5 L8.5 7 H29.5 V23.5 H6.5 L3 18.5 Z" fill="#0f766e" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
      <!-- White municipal stripe + compactor rib -->
      <rect x="7" y="11" width="19.5" height="6.5" rx="1.5" fill="#ffffff" fill-opacity="0.18"/>
      <path d="M14.5 12.2 L17.5 12.2 L16 15.8 Z" stroke="#5eead4" stroke-width="1.2" fill="none"/>
      <line x1="8.5" y1="7.5" x2="8.5" y2="23" stroke="#99f6e4" stroke-width="1.1" stroke-dasharray="2 2"/>
      <!-- Forward heavy cab -->
      <path d="M31 9 H39.5 C41.2 9 42.5 10.2 43.3 11.8 L45.5 16.5 V22.5 C45.5 23.4 44.8 24 43.8 24 H31 Z" fill="#115e59" stroke="#ffffff" stroke-width="1.4"/>
      <!-- Cab windshield -->
      <path d="M33.5 11.2 H39.8 L42.5 16 H33.5 Z" fill="#e0f2fe"/>
      <!-- Amber roof beacon -->
      <circle cx="35.5" cy="7.5" r="2.1" fill="${beacon}" stroke="#ffffff" stroke-width="0.9"/>
      <!-- Headlight -->
      <rect x="43.5" y="18" width="2" height="2.4" rx="0.5" fill="#fef08a"/>
      <!-- Heavy wheels -->
      <circle cx="13" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
      <circle cx="13" cy="25.2" r="1.7" fill="#cbd5e1"/>
      <circle cx="23" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
      <circle cx="23" cy="25.2" r="1.7" fill="#cbd5e1"/>
      <circle cx="38.5" cy="25.2" r="4.3" fill="#0f172a" stroke="#ffffff" stroke-width="1.3"/>
      <circle cx="38.5" cy="25.2" r="1.7" fill="#cbd5e1"/>
    </svg>`;
}

export function createVehicleMarkerIcon({
  type = 'compactor',
  registrationNumber = 'SWM',
  heading = 0,
  speedKmh = 0,
  isEnRoute = false,
  selected = false
}: {
  type?: string;
  registrationNumber?: string;
  heading?: number;
  speedKmh?: number;
  isEnRoute?: boolean;
  selected?: boolean;
}) {
  const { ring, badgeBg } = getVehiclePalette(type, isEnRoute);
  const isMoving = speedKmh > 0 || isEnRoute;
  const svg = renderVehicleProfileSvg(type, isMoving);
  const shortPlate = registrationNumber.replace(/^KA-0?/, 'KA-');
  const facingLeft = heading > 180 && heading < 360;

  return L.divIcon({
    className: 'swm-live-vehicle-marker',
    html: `
      <div style="position:relative;width:78px;height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;">
        <div style="position:relative;width:54px;height:42px;display:flex;align-items:center;justify-content:center;">
          ${
            isMoving
              ? `<span class="swm-radar-ring" style="position:absolute;width:44px;height:44px;border-radius:9999px;background:${ring};"></span>`
              : ''
          }
          ${
            selected
              ? `<span style="position:absolute;width:54px;height:54px;border-radius:9999px;border:2.5px solid #0284c7;box-shadow:0 0 12px rgba(2,132,199,0.55);"></span>`
              : ''
          }
          <!-- Directional heading compass pointer -->
          <div style="position:absolute;width:48px;height:48px;transform:rotate(${heading}deg);transition:transform 0.8s ease-out;pointer-events:none;z-index:1;">
            <div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #0ea5e9;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></div>
          </div>
          <!-- Realistic vehicle profile (flips left/right, never upside down) -->
          <div style="transform:scaleX(${facingLeft ? -1 : 1});transition:transform 0.35s ease;filter:drop-shadow(0 4px 6px rgba(15,23,42,0.42));position:relative;z-index:2;display:flex;align-items:center;justify-content:center;">
            ${svg}
          </div>
        </div>
        <div style="margin-top:0px;padding:1.5px 7px;border-radius:9999px;background:${badgeBg};color:#ffffff;font-size:9.5px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;border:1px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(15,23,42,0.35);z-index:3;display:flex;align-items:center;gap:4px;">
          <span style="width:5px;height:5px;border-radius:9999px;background:${isMoving ? '#4ade80' : '#fbbf24'};display:inline-block;"></span>
          <span>${shortPlate}</span>
          ${speedKmh > 0 ? `<span style="color:#93c5fd;font-weight:600;">${speedKmh}k</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [78, 66],
    iconAnchor: [39, 24],
    popupAnchor: [0, -24]
  });
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'critical':
      return { bg: '#dc2626', ring: 'rgba(220,38,38,0.45)', pulse: true };
    case 'high':
      return { bg: '#ea580c', ring: 'rgba(234,88,12,0.35)', pulse: true };
    case 'medium':
      return { bg: '#d97706', ring: 'rgba(217,119,6,0.28)', pulse: false };
    default:
      return { bg: '#0f766e', ring: 'rgba(15,118,110,0.25)', pulse: false };
  }
}

function getCategoryGlyph(category: string) {
  if (category === 'hazardous' || category === 'medical') {
    return `<path d="M12 6.5 L17.5 16 H6.5 Z" stroke="#fff" stroke-width="1.7" fill="none" stroke-linejoin="round"/><line x1="12" y1="10" x2="12" y2="12.8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="14.6" r="0.8" fill="#fff"/>`;
  }
  if (category === 'electronic') {
    return `<path d="M13 6 L8.5 12.5 H12 L11 18 L15.5 11.5 H12 Z" fill="#fff"/>`;
  }
  if (category === 'recyclable' || category === 'plastic') {
    return `<path d="M9 9.5 L12 6.5 L15 9.5 M15.5 13 L13.5 16.5 H9.5 M8.5 13 L10 10.5" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (category === 'organic') {
    return `<path d="M8 16 C8 10.5 12 7.5 16.5 7.5 C16.5 12.5 13.5 16 8 16 Z" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M8 16 L12.5 11.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  return `<path d="M8.5 9.5 H15.5 M10 9.5 V8 H14 V9.5 M9.3 9.5 L9.8 16.2 H14.2 L14.7 9.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function createComplaintMarkerIcon({
  priority = 'medium',
  wasteCategory = 'mixed',
  code = '',
  showLabel = false
}: {
  priority?: string;
  wasteCategory?: string;
  code?: string;
  showLabel?: boolean;
}) {
  const { bg, ring, pulse } = getPriorityStyle(priority);
  const glyph = getCategoryGlyph(wasteCategory);

  return L.divIcon({
    className: 'swm-complaint-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:44px;height:52px;">
        ${
          pulse
            ? `<span class="swm-beacon-ring" style="position:absolute;top:2px;width:32px;height:32px;border-radius:9999px;background:${ring};"></span>`
            : ''
        }
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:2;filter:drop-shadow(0 4px 6px rgba(15,23,42,0.4));">
          <path d="M17 2 C9.3 2 3 8.2 3 16 C3 25.4 17 40 17 40 C17 40 31 25.4 31 16 C31 8.2 24.7 2 17 2 Z" fill="${bg}" stroke="#ffffff" stroke-width="2.2"/>
          <g transform="translate(5, 4)">${glyph}</g>
        </svg>
        ${
          showLabel && code
            ? `<span style="margin-top:-2px;padding:1px 5px;border-radius:4px;background:rgba(15,23,42,0.88);color:#fff;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;white-space:nowrap;z-index:3;">${code}</span>`
            : ''
        }
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 40],
    popupAnchor: [0, -38]
  });
}

export function createLocationPickerIcon() {
  return L.divIcon({
    className: 'swm-picker-marker',
    html: `
      <div style="position:relative;width:40px;height:48px;display:flex;align-items:center;justify-content:center;">
        <span class="swm-radar-ring" style="position:absolute;bottom:2px;width:24px;height:12px;border-radius:9999px;background:rgba(15,118,110,0.35);"></span>
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:2;filter:drop-shadow(0 5px 8px rgba(15,23,42,0.38));">
          <path d="M18 2 C9.7 2 3 8.7 3 17 C3 27.5 18 42 18 42 C18 42 33 27.5 33 17 C33 8.7 26.3 2 18 2 Z" fill="#0f766e" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="18" cy="17" r="6" fill="#ffffff"/>
          <circle cx="18" cy="17" r="2.6" fill="#0f766e"/>
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 42]
  });
}
