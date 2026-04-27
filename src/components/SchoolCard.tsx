import Link from "next/link";
import Image from "next/image";
import type { School } from "@/lib/types";
import { formatFeeRange } from "@/lib/schools";

export default function SchoolCard({ school }: { school: School }) {
  const tokens = school.curriculum ?? [];
  return (
    <Link
      href={`/schools/${school.slug}`}
      className="group block bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-lg transition overflow-hidden flex flex-col"
    >
      {/* Logo strip — small bar with logo on the side, NOT a full hero photo. */}
      <div className="flex items-stretch gap-3 p-3 border-b border-slate-100 bg-gradient-to-bl from-slate-50 to-white">
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
          {school.photo?.originalUrl ? (
            <Image
              src={school.photo.originalUrl}
              alt={school.name}
              fill
              sizes="80px"
              className="object-contain p-1.5"
              unoptimized
            />
          ) : (
            <span className="text-2xl font-bold text-slate-300">
              {school.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 group-hover:text-teal-700 line-clamp-2 leading-snug">
              {school.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              {[school.district, school.city].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {school.rating !== undefined && school.rating > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                ★ {school.rating.toFixed(1)}
                {school.reviewCount ? (
                  <span className="text-[10px] text-amber-600 font-normal">
                    ({school.reviewCount.toLocaleString("ar-SA")})
                  </span>
                ) : null}
              </span>
            )}
            {school.type && (
              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                {school.type}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-6">
          {tokens.slice(0, 3).map((c) => (
            <Tag key={c}>{c}</Tag>
          ))}
          {school.gender && <Tag>{school.gender}</Tag>}
        </div>

        <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100 mt-auto">
          <span className="text-slate-500">الرسوم</span>
          <span
            className={
              school.fees || school.startingFee
                ? "font-bold text-teal-700"
                : "text-slate-400"
            }
          >
            {formatFeeRange(school)}
          </span>
        </div>
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
