"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { FeesSummary } from "@/lib/types";

export interface MapSchool {
  id: number;
  slug: string;
  name: string;
  city?: string;
  district?: string;
  type?: string;
  lat: number;
  lng: number;
  fees?: FeesSummary;
  startingFee?: number;
}

const icon = L.divIcon({
  className: "fisool-marker",
  html: `<div style="background:#0d9488;color:white;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-family:inherit;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">ف</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function formatFee(s: MapSchool): string {
  if (s.fees) {
    if (s.fees.min === s.fees.max) return `${s.fees.min.toLocaleString("ar-SA")} ر.س`;
    return `${s.fees.min.toLocaleString("ar-SA")} - ${s.fees.max.toLocaleString("ar-SA")} ر.س`;
  }
  if (s.startingFee) return `تبدأ من ${s.startingFee.toLocaleString("ar-SA")} ر.س`;
  return "غير متوفرة";
}

export default function MapView({ schools }: { schools: MapSchool[] }) {
  return (
    <MapContainer
      center={[24.5, 45.5]}
      zoom={6}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {schools.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
          <Popup>
            <div style={{ minWidth: 220, fontFamily: "inherit" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {s.name}
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
                {[s.district, s.city].filter(Boolean).join(" · ")}
              </div>
              {s.type && (
                <div style={{ color: "#0f766e", fontSize: 13, marginBottom: 4 }}>
                  {s.type}
                </div>
              )}
              <div style={{ color: "#0f766e", fontSize: 13, marginBottom: 8 }}>
                {formatFee(s)}
              </div>
              <Link
                href={`/schools/${s.slug}`}
                style={{
                  display: "inline-block",
                  background: "#0d9488",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                التفاصيل ←
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
