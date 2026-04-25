import Link from "next/link";
import type { School } from "@/lib/types";
import { formatFees } from "@/lib/schools";

export default function SchoolCard({ school }: { school: School }) {
  return (
    <Link
      href={`/schools/${school.slug}`}
      className="group block bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-lg transition p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-700 line-clamp-2">
            {school.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {school.neighborhood} · {school.type}
          </p>
        </div>
        {school.rating && (
          <span className="shrink-0 inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-sm font-semibold">
            ★ {school.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag>{school.curriculum}</Tag>
        <Tag>{school.gender}</Tag>
        {school.stages.slice(0, 2).map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
        {school.stages.length > 2 && <Tag>+{school.stages.length - 2}</Tag>}
      </div>

      <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
        <span className="text-slate-500">الرسوم السنوية</span>
        <span className="font-bold text-teal-700">
          {formatFees(school.feesMin, school.feesMax)}
        </span>
      </div>
    </Link>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs">
      {children}
    </span>
  );
}
