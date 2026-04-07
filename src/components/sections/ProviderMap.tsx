"use client";

import { useState } from "react";
import { MapPin, ZoomIn, ZoomOut } from "lucide-react";

interface MapProvider {
  name: string;
  type?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

// Ontario city coordinates for plotting providers
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "london": { lat: 42.9849, lng: -81.2453 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "ottawa": { lat: 45.4215, lng: -75.6972 },
  "mississauga": { lat: 43.5890, lng: -79.6441 },
  "peterborough": { lat: 44.3091, lng: -78.3197 },
  "hamilton": { lat: 43.2557, lng: -79.8711 },
  "kitchener": { lat: 43.4516, lng: -80.4925 },
  "windsor": { lat: 42.3149, lng: -83.0364 },
  "woodstock": { lat: 43.1306, lng: -80.7467 },
};

function getCityFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const city of Object.keys(CITY_COORDS)) {
    if (lower.includes(city)) return city;
  }
  return null;
}

interface ProviderMapProps {
  providers: MapProvider[];
  childCity?: string;
  onSelectCity?: (city: string) => void;
}

export function ProviderMap({ providers, childCity, onSelectCity }: ProviderMapProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Group providers by city
  const providersByCity: Record<string, MapProvider[]> = {};
  for (const p of providers) {
    const city = getCityFromText(p.city || p.type || p.name || "");
    if (city) {
      if (!providersByCity[city]) providersByCity[city] = [];
      providersByCity[city].push(p);
    }
  }

  // Get home city
  const homeCity = childCity ? getCityFromText(childCity) : null;

  const handleCityClick = (city: string) => {
    setSelectedCity(city === selectedCity ? null : city);
    onSelectCity?.(city);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Map header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Provider Map
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Click a city to filter providers
        </p>
      </div>

      {/* Map area — SVG-based Ontario map */}
      <div className="relative bg-warm-50 p-4" style={{ minHeight: 280 }}>
        {/* Simple dot map of Ontario cities */}
        <svg viewBox="0 0 400 300" className="w-full h-[260px]" aria-label="Ontario provider locations">
          {/* Ontario outline (simplified) */}
          <path
            d="M50,250 C80,240 120,220 150,200 C180,180 200,160 220,140 C240,120 260,110 280,100 C300,90 320,85 340,80 C350,75 360,70 370,60 L380,50 L370,40 L350,35 L320,30 L280,35 L240,45 L200,60 L160,80 L120,110 L80,150 L60,190 L50,250 Z"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* City dots */}
          {Object.entries(CITY_COORDS).map(([city, coords]) => {
            // Map real coords to SVG viewport (approximate)
            const x = ((coords.lng + 84) / 9) * 400;
            const y = ((46 - coords.lat) / 5) * 300;
            const provCount = providersByCity[city]?.length || 0;
            const isHome = city === homeCity;
            const isSelected = city === selectedCity;
            const hasProviders = provCount > 0;

            return (
              <g key={city} onClick={() => handleCityClick(city)} className="cursor-pointer">
                {/* Pulse ring for home city */}
                {isHome && (
                  <circle cx={x} cy={y} r="18" fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3">
                    <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* City dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={hasProviders ? (isSelected ? 10 : 8) : 5}
                  fill={isHome ? "var(--color-primary)" : hasProviders ? "var(--color-status-current)" : "var(--color-border)"}
                  stroke={isSelected ? "var(--color-foreground)" : "white"}
                  strokeWidth={isSelected ? 2 : 1.5}
                  opacity={hasProviders ? 1 : 0.5}
                />

                {/* Provider count */}
                {hasProviders && (
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] font-bold fill-white pointer-events-none"
                  >
                    {provCount}
                  </text>
                )}

                {/* City label */}
                <text
                  x={x}
                  y={y + (hasProviders ? 18 : 14)}
                  textAnchor="middle"
                  className={`text-[9px] pointer-events-none ${isSelected || isHome ? "font-semibold fill-foreground" : "fill-muted-foreground"}`}
                >
                  {city.charAt(0).toUpperCase() + city.slice(1)}
                  {isHome ? " 🏠" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected city details */}
      {selectedCity && providersByCity[selectedCity] && (
        <div className="px-4 py-3 border-t border-border bg-warm-50">
          <p className="text-[12px] font-semibold text-foreground mb-1">
            📍 {selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)} — {providersByCity[selectedCity].length} providers
          </p>
          <div className="flex flex-wrap gap-1.5">
            {providersByCity[selectedCity].map((p, i) => (
              <span key={i} className="text-[11px] bg-card border border-border rounded px-2 py-0.5 text-foreground">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
