import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getSchoolBySlug,
  formatSAR,
  formatFeeRange,
  curriculumTokens,
  gradeLevelTokens,
  schools,
} from "@/lib/schools";
import SchoolCard from "@/components/SchoolCard";

// We generate the top ~150 schools statically. The rest render on-demand —
// otherwise building 1,800 pages exhausts the build worker's heap.
export const dynamicParams = true;

export function generateStaticParams() {
  return [...schools]
    .filter((s) => (s.rating ?? 0) >= 4 && (s.reviewCount ?? 0) >= 5)
    .sort((a, b) => {
      const sa = (a.rating ?? 0) * Math.log((a.reviewCount ?? 0) + 1);
      const sb = (b.rating ?? 0) * Math.log((b.reviewCount ?? 0) + 1);
      return sb - sa;
    })
    .slice(0, 150)
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getSchoolBySlug(slug);
  if (!s) return { title: "المدرسة غير موجودة" };
  const desc =
    s.about?.slice(0, 160) ??
    `${s.name} في ${s.district ? `${s.district}، ` : ""}${s.city ?? "المملكة"} — ${s.type ?? "مدرسة"}.`;
  return {
    title: s.name,
    description: desc,
    openGraph: {
      title: s.name,
      description: desc,
      images: s.photo?.originalUrl ? [s.photo.originalUrl] : undefined,
    },
  };
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSchoolBySlug(slug);
  if (!s) notFound();

  const similar = schools
    .filter(
      (x) =>
        x.id !== s.id && x.city === s.city && x.district === s.district,
    )
    .slice(0, 3);

  const curricula = curriculumTokens(s);
  const grades = gradeLevelTokens(s);
  const hasFees = s.fees || s.startingFee !== undefined;

  return (
    <article className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-teal-700">
          الرئيسية
        </Link>
        {s.city && (
          <>
            <span>/</span>
            <Link
              href={`/search?city=${encodeURIComponent(s.city)}`}
              className="hover:text-teal-700"
            >
              {s.city}
            </Link>
          </>
        )}
        {s.district && (
          <>
            <span>/</span>
            <span className="text-slate-700">{s.district}</span>
          </>
        )}
      </nav>

      {/* Hero with photo */}
      {s.photo?.originalUrl && (
        <div className="relative aspect-[16/7] rounded-2xl overflow-hidden mb-6 bg-slate-100">
          <Image
            src={s.photo.originalUrl}
            alt={s.name}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      {/* Header */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              {s.name}
            </h1>
            {s.nameEn && s.nameEn !== s.name && (
              <p className="text-slate-500 mb-2" dir="ltr">
                {s.nameEn}
              </p>
            )}
            <p className="text-slate-600">
              {[s.district, s.city].filter(Boolean).join("، ")}
            </p>
          </div>
          {s.rating && (
            <div className="shrink-0 inline-flex flex-col items-center gap-1 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl">
              <span className="text-2xl font-bold leading-none">
                ★ {s.rating.toFixed(1)}
              </span>
              {s.reviewCount ? (
                <span className="text-xs text-amber-600">
                  {s.reviewCount.toLocaleString("ar-SA")} تقييم
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {s.type && <Pill>{s.type}</Pill>}
          {s.gender && <Pill>{s.gender}</Pill>}
          {curricula.map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>

        {grades.length > 0 && (
          <p className="text-sm text-slate-600 mb-4">
            <span className="text-slate-400">المراحل: </span>
            {grades.join("، ")}
          </p>
        )}

        {s.about && (
          <div className="text-slate-700 leading-loose whitespace-pre-line border-t border-slate-100 pt-4">
            {s.about}
          </div>
        )}
      </header>

      {/* Quick facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoCard
          label="الرسوم"
          value={formatFeeRange(s)}
          muted={!hasFees}
        />
        {s.foundedYear && (
          <InfoCard label="سنة التأسيس" value={s.foundedYear.toString()} />
        )}
        {s.reviewCount !== undefined && s.reviewCount > 0 && (
          <InfoCard
            label="عدد التقييمات"
            value={s.reviewCount.toLocaleString("ar-SA")}
          />
        )}
        {s.fees?.count && (
          <InfoCard
            label="عدد فئات الرسوم"
            value={s.fees.count.toLocaleString("ar-SA")}
          />
        )}
      </div>

      {/* Sub-ratings */}
      {s.subRatings && Object.keys(s.subRatings).length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            تقييمات تفصيلية من أولياء الأمور
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(s.subRatings).map(([cat, val]) => (
              <RatingBar key={cat} label={cat} value={val} />
            ))}
          </div>
        </section>
      )}

      {/* Fees breakdown */}
      {s.fees && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            تفاصيل الرسوم الدراسية
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <FeeCell label="أقل رسوم" value={formatSAR(s.fees.min)} />
            <FeeCell label="أعلى رسوم" value={formatSAR(s.fees.max)} />
            <FeeCell label="الوسيط" value={formatSAR(s.fees.median)} />
            <FeeCell label="فئات" value={String(s.fees.count)} />
          </div>
          {(s.fees.boysMin || s.fees.girlsMin) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              {s.fees.boysMin !== undefined && s.fees.boysMax !== undefined && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-700 mb-1">رسوم البنين</div>
                  <div className="font-bold text-slate-900">
                    {s.fees.boysMin === s.fees.boysMax
                      ? formatSAR(s.fees.boysMin)
                      : `${formatSAR(s.fees.boysMin)} - ${formatSAR(s.fees.boysMax)}`}
                  </div>
                </div>
              )}
              {s.fees.girlsMin !== undefined &&
                s.fees.girlsMax !== undefined && (
                  <div className="bg-pink-50 rounded-xl p-4">
                    <div className="text-sm text-pink-700 mb-1">رسوم البنات</div>
                    <div className="font-bold text-slate-900">
                      {s.fees.girlsMin === s.fees.girlsMax
                        ? formatSAR(s.fees.girlsMin)
                        : `${formatSAR(s.fees.girlsMin)} - ${formatSAR(s.fees.girlsMax)}`}
                    </div>
                  </div>
                )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            * الرسوم تُمثّل النطاق المُعلَن للمدرسة عبر صفوفها المختلفة. يُنصح
            بالتواصل مع المدرسة لتأكيد الرسوم لصف طفلك.
          </p>
        </section>
      )}

      {/* Map */}
      <section className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 overflow-hidden">
        <iframe
          title={`موقع ${s.name}`}
          className="w-full h-72 rounded-xl"
          src={`https://maps.google.com/maps?q=${s.lat},${s.lng}&z=15&output=embed`}
          loading="lazy"
        />
        <div className="text-center pt-3 pb-2">
          <a
            href={`https://maps.google.com/?q=${s.lat},${s.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-teal-900 text-sm font-semibold"
          >
            افتح في خرائط Google ←
          </a>
        </div>
      </section>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            مدارس قريبة في نفس الحي
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {similar.map((x) => (
              <SchoolCard key={x.id} school={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm">
      {children}
    </span>
  );
}

function InfoCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div
        className={`font-bold text-base ${muted ? "text-slate-400" : "text-slate-900"}`}
      >
        {value}
      </div>
    </div>
  );
}

function FeeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="font-bold text-sm text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-700">{label}</span>
        <span className="font-bold text-amber-700 tabular-nums">
          ★ {value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
