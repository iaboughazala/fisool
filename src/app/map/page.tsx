import { schools } from "@/lib/schools";
import MapWrapper from "@/components/MapWrapper";

export const metadata = {
  title: "خريطة المدارس",
  description: "خريطة تفاعلية لكل المدارس في المملكة العربية السعودية.",
};

export default function MapPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          خريطة المدارس في المملكة
        </h1>
        <p className="text-slate-600 mt-1">
          {schools.length.toLocaleString("ar-SA")} مدرسة على الخريطة — اضغط على
          المؤشر لعرض التفاصيل.
        </p>
      </div>
      <div className="h-[75vh] min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <MapWrapper schools={schools} />
      </div>
    </div>
  );
}
