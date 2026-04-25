"use client";

import dynamic from "next/dynamic";
import type { School } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-500">
      جاري تحميل الخريطة...
    </div>
  ),
});

export default function MapWrapper({ schools }: { schools: School[] }) {
  return <MapView schools={schools} />;
}
