"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// -- Types -------------------------------------------------------------------

export interface MapMarker {
  name: string;
  lat: number;
  lng: number;
  type?: string;
  services?: string[] | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  location_city?: string;
  location_address?: string;
  is_verified?: boolean;
}

interface LeafletMapInnerProps {
  markers: MapMarker[];
  center: [number, number];
}

// -- Custom marker icons (DivIcon — no external images needed) ---------------

const verifiedIcon = L.divIcon({
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -15],
  html: `<div style="width:26px;height:26px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
  </div>`,
});

const defaultIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -13],
  html: `<div style="width:22px;height:22px;background:#c96442;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
});

// -- Fit bounds when markers change ------------------------------------------

function FitBounds({ markers, center }: { markers: MapMarker[]; center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 13);
    } else {
      map.setView(center, 11);
    }
  }, [map, center, markers]);

  return null;
}

// -- Popup content builder ---------------------------------------------------

function PopupContent({ marker }: { marker: MapMarker }) {
  const services = marker.services?.slice(0, 3).join(" · ") || "";
  const address = [marker.location_address, marker.location_city]
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ minWidth: 180, maxWidth: 260, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a19" }}>
          {marker.name}
        </span>
        {marker.is_verified && (
          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>
            Verified
          </span>
        )}
      </div>
      {marker.type && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          {marker.type}
        </div>
      )}
      {services && (
        <div style={{ fontSize: 12, color: "#4a4a48", marginBottom: 6 }}>
          {services}
        </div>
      )}
      {address && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
          {address}
        </div>
      )}
      {marker.phone && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
          <a
            href={`tel:${marker.phone.replace(/\s/g, "")}`}
            style={{ color: "#c96442", textDecoration: "none" }}
          >
            {marker.phone}
          </a>
        </div>
      )}
      {marker.website && (
        <div style={{ fontSize: 11 }}>
          <a
            href={marker.website.startsWith("http") ? marker.website : `https://${marker.website}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#c96442", textDecoration: "none" }}
          >
            {marker.website.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}
    </div>
  );
}

// -- Main map component ------------------------------------------------------

export default function LeafletMapInner({ markers, center }: LeafletMapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={true}
      style={{ height: 400, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} center={center} />
      {markers.map((m, i) => (
        <Marker
          key={`${m.name}-${i}`}
          position={[m.lat, m.lng]}
          icon={m.is_verified ? verifiedIcon : defaultIcon}
        >
          <Popup maxWidth={280}>
            <PopupContent marker={m} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
