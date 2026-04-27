import { schools } from "@/lib/schools";
import MapWrapper from "@/components/MapWrapper";

export const metadata = {
  title: "خريطة المدارس",
  description: "خريطة تفاعلية لكل المدارس في المملكة العربية السعودية.",
};

export default function MapPage() {
  // Trim payload sent to the client: only fields the marker popup uses.
  const mappable = schools
    .filter((s) => s.lat !== undefined && s.lng !== undefined)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      city: s.city,
      district: s.district,
      type: s.type,
      lat: s.lat!,
      lng: s.lng!,
      fees: s.fees,
      startingFee: s.startingFee,
    }));

  const missing = schools.length - mappable.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          خريطة المدارس في المملكة
        </h1>
        <p className="text-slate-600 mt-1">
          {mappable.length.toLocaleString("ar-SA")} مدرسة على الخريطة — اضغط
          على المؤشر لعرض التفاصيل.
          {missing > 0 && (
            <span className="text-slate-400 text-sm">
              {" "}
              ({missing.toLocaleString("ar-SA")} مدرسة بدون إحداثيات لا تظهر
              على الخريطة)
            </span>
          )}
        </p>
      </div>
      <div className="h-[75vh] min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <MapWrapper schools={mappable} />
      </div>
    </div>
  );
}
