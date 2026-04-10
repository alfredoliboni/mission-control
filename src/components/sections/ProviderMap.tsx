"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { MapMarker } from "./LeafletMapInner";

// Dynamically import Leaflet map (needs window/document — no SSR)
const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="bg-warm-50 flex items-center justify-center"
      style={{ height: 400 }}
    >
      <p className="text-[13px] text-muted-foreground animate-pulse">
        Loading map...
      </p>
    </div>
  ),
});

// -- Ontario city coordinates ------------------------------------------------

const CITY_COORDS: Record<string, [number, number]> = {
  london: [42.9849, -81.2453],
  toronto: [43.6532, -79.3832],
  ottawa: [45.4215, -75.6972],
  mississauga: [43.589, -79.6441],
  peterborough: [44.3091, -78.3197],
  hamilton: [43.2557, -79.8711],
  kitchener: [43.4516, -80.4925],
  windsor: [42.3149, -83.0364],
  woodstock: [43.1306, -80.7467],
  brampton: [43.7315, -79.7624],
  markham: [43.8561, -79.337],
  vaughan: [43.8361, -79.4983],
  "richmond hill": [43.8828, -79.4403],
  oakville: [43.4675, -79.6877],
  burlington: [43.3255, -79.799],
  barrie: [44.3894, -79.6903],
  guelph: [43.5448, -80.2482],
  cambridge: [43.3616, -80.3144],
  waterloo: [43.4643, -80.5204],
  "st. catharines": [43.1594, -79.2469],
  "st catharines": [43.1594, -79.2469],
  "niagara falls": [43.0896, -79.0849],
  "thunder bay": [48.3809, -89.2477],
  sudbury: [46.4917, -80.993],
  kingston: [44.2312, -76.486],
  oshawa: [43.8971, -78.8658],
  ajax: [43.8509, -79.0204],
  pickering: [43.8354, -79.0868],
  whitby: [43.8975, -78.9429],
  brantford: [43.1394, -80.2644],
  sarnia: [42.9745, -82.4066],
  stratford: [43.37, -80.9822],
  "north bay": [46.3091, -79.4608],
  "sault ste. marie": [46.5219, -84.3461],
  timmins: [48.4758, -81.3305],
  chatham: [42.4048, -82.191],
  belleville: [44.1628, -77.3832],
  cornwall: [45.0216, -74.7304],
  newmarket: [44.0592, -79.4613],
  aurora: [44.0065, -79.4504],
  "north york": [43.7615, -79.4111],
  scarborough: [43.7764, -79.2318],
  etobicoke: [43.6205, -79.5132],
};

// -- Helpers -----------------------------------------------------------------

function getCityCoords(cityName: string): [number, number] | null {
  const lower = cityName.toLowerCase().trim();
  if (CITY_COORDS[lower]) return CITY_COORDS[lower];
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key) || key.includes(lower)) return coords;
  }
  return null;
}

/** Deterministic jitter so markers in the same city don't stack */
function jitter(name: string, idx: number): [number, number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  const latOff = ((h % 100) / 100) * 0.018 - 0.009;
  const lngOff = (((h >> 8) % 100) / 100) * 0.018 - 0.009;
  return [latOff + idx * 0.0008, lngOff - idx * 0.0008];
}

// -- Props -------------------------------------------------------------------

export interface ProviderForMap {
  id?: string;
  name: string;
  type?: string | null;
  city?: string;
  location_city?: string | null;
  location_address?: string | null;
  services?: string[] | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  is_verified?: boolean;
}

interface ProviderMapProps {
  providers: ProviderForMap[];
  childCity?: string;
}

// -- Component ---------------------------------------------------------------

export function ProviderMap({ providers, childCity }: ProviderMapProps) {
  const markers = useMemo(() => {
    const result: MapMarker[] = [];
    providers.forEach((p, i) => {
      const city = p.location_city || p.city || "";
      const coords = getCityCoords(city);
      if (!coords) return;
      const [dLat, dLng] = jitter(p.name, i);
      result.push({
        name: p.name,
        lat: coords[0] + dLat,
        lng: coords[1] + dLng,
        type: p.type || undefined,
        services: p.services,
        phone: p.phone,
        email: p.email,
        website: p.website,
        location_city: p.location_city || p.city,
        location_address: p.location_address || undefined,
        is_verified: p.is_verified,
      });
    });
    return result;
  }, [providers]);

  const center = useMemo<[number, number]>(() => {
    if (childCity) {
      const c = getCityCoords(childCity);
      if (c) return c;
    }
    return [42.9849, -81.2453]; // London, ON default
  }, [childCity]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Provider Map
        </h3>
        <p className="text-[11px] text-muted-foreground">
          {markers.length} provider{markers.length !== 1 ? "s" : ""} on map
        </p>
      </div>
      <LeafletMap markers={markers} center={center} />
    </div>
  );
}
