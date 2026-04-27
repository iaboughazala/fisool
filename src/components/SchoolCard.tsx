import Link from "next/link";
import Image from "next/image";
import type { School } from "@/lib/types";
import { formatFeeRange, curriculumTokens } from "@/lib/schools";

export default function SchoolCard({ school }: { school: School }) {
  const tokens = curriculumTokens(school);
  return (
    <Link
      href={`/schools/${school.slug}`}
      className="group block bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-lg transition overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[16/9] bg-slate-100">
        {school.photo?.originalUrl ? (
          <Image
            src={school.photo.originalUrl}
            alt={school.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-5xl font-bold">
            {school.name.charAt(0)}
          </div>
        )}
        {school.rating !== undefined && school.rating > 0 && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/95 text-amber-700 px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
            ★ {school.rating.toFixed(1)}
            {school.reviewCount ? (
              <span className="text-xs text-slate-500 font-normal">
                ({school.reviewCount.toLocaleString("ar-SA")})
              </span>
            ) : null}
          </span>
        )}
        {school.type && (
          <span className="absolute top-3 right-3 bg-teal-700/95 text-white px-2.5 py-1 rounded-lg text-xs font-semibold">
            {school.type}
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-base text-slate-900 group-hover:text-teal-700 line-clamp-2 mb-1.5 leading-snug">
          {school.name}
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          {[school.district, school.city].filter(Boolean).join(" · ")}
        </p>

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
