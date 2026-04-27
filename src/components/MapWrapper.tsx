"use client";

import dynamic from "next/dynamic";
import type { MapSchool } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-500">
      جاري تحميل الخريطة...
    </div>
  ),
});

export default function MapWrapper({ schools }: { schools: MapSchool[] }) {
  return <MapView schools={schools} />;
}
