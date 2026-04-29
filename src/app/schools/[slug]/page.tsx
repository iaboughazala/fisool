import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getSchoolBySlug,
  formatSAR,
  formatFeeRange,
  schools,
} from "@/lib/schools";
import type { School } from "@/lib/types";
import SchoolCard from "@/components/SchoolCard";

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

  const curricula = s.curriculum ?? [];
  const grades = s.gradeLevels ?? [];
  const hasFees = s.fees || s.startingFee !== undefined;
  const hasCoords = s.lat !== undefined && s.lng !== undefined;
  const shareUrl = `https://fisool.finalizat.com/schools/${s.slug}`;

  return (
    <article className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-teal-700">الرئيسية</Link>
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

      {/* Header card with side logo, NOT a full hero. */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4 sm:gap-5 mb-4">
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
            {s.photo?.originalUrl ? (
              <Image
                src={s.photo.originalUrl}
                alt={s.name}
                fill
                sizes="(max-width: 640px) 80px, 112px"
                className="object-contain p-2"
                priority
                unoptimized
              />
            ) : (
              <span className="text-3xl font-bold text-slate-300">
                {s.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight mb-1">
              {s.name}
            </h1>
            {s.nameEn && s.nameEn !== s.name && (
              <p className="text-slate-500 text-sm mb-1.5" dir="ltr">
                {s.nameEn}
              </p>
            )}
            <p className="text-slate-600 text-sm">
              {[s.district, s.city].filter(Boolean).join("، ")}
            </p>

            {s.rating !== undefined && s.rating > 0 && (
              <div className="mt-2.5 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                <span className="text-lg font-bold leading-none">
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
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {s.type && <Pill>{s.type}</Pill>}
          {s.gender && <Pill>{s.gender}</Pill>}
          {curricula.map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>

        {grades.length > 0 && (
          <p className="text-sm text-slate-600 mb-3">
            <span className="text-slate-400">المراحل: </span>
            {grades.join("، ")}
          </p>
        )}

        {s.about && (
          <div className="text-slate-700 leading-loose whitespace-pre-line border-t border-slate-100 pt-4 text-sm sm:text-base">
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
          <InfoCard
            label="سنة التأسيس"
            value={
              s.foundationDate && /^\d{4}-\d{2}-\d{2}/.test(s.foundationDate)
                ? s.foundationDate.slice(0, 10)
                : s.foundedYear.toString()
            }
          />
        )}
        {s.studentCount !== undefined && s.studentCount > 0 && (
          <InfoCard
            label="عدد الطلاب"
            value={s.studentCount.toLocaleString("ar-SA")}
          />
        )}
        {s.reviewCount !== undefined && s.reviewCount > 0 && (
          <InfoCard
            label="عدد التقييمات"
            value={s.reviewCount.toLocaleString("ar-SA")}
          />
        )}
        {s.gradeFees && s.gradeFees.length > 0 && (
          <InfoCard
            label="فئات الرسوم"
            value={s.gradeFees.length.toLocaleString("ar-SA")}
          />
        )}
      </div>

      {/* Contact */}
      {(s.phone || s.mobile || s.whatsapp || s.email || s.website || s.profilePdfUrl || s.address) && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            بيانات الاتصال
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {s.phone && (
              <ContactRow icon="📞" label="هاتف">
                <a href={`tel:${s.phone}`} dir="ltr" className="text-teal-700 hover:text-teal-900">
                  {s.phone}
                </a>
              </ContactRow>
            )}
            {s.mobile && (
              <ContactRow icon="📱" label="جوال">
                <a href={`tel:${s.mobile}`} dir="ltr" className="text-teal-700 hover:text-teal-900">
                  {s.mobile}
                </a>
              </ContactRow>
            )}
            {s.whatsapp && (
              <ContactRow icon="💬" label="واتساب">
                <a
                  href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  {s.whatsapp}
                </a>
              </ContactRow>
            )}
            {s.email && (
              <ContactRow icon="✉️" label="البريد الإلكتروني">
                <a href={`mailto:${s.email}`} dir="ltr" className="text-teal-700 hover:text-teal-900 break-all">
                  {s.email}
                </a>
              </ContactRow>
            )}
            {s.website && (
              <ContactRow icon="🌐" label="الموقع الإلكتروني">
                <a
                  href={s.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="text-teal-700 hover:text-teal-900 break-all"
                >
                  {s.website}
                </a>
              </ContactRow>
            )}
            {s.address && (
              <ContactRow icon="📍" label="العنوان">
                <span>{s.address}</span>
              </ContactRow>
            )}
            {s.profilePdfUrl && (
              <ContactRow icon="📄" label="بروفايل المدرسة">
                <a
                  href={s.profilePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:text-teal-900 font-medium"
                >
                  تحميل ملف PDF
                </a>
              </ContactRow>
            )}
          </div>
        </section>
      )}

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

      {/* Per-grade fee tables, grouped by track */}
      {s.gradeFees && s.gradeFees.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <h2 className="font-bold text-lg text-slate-900">
              الرسوم الدراسية لكل صف
            </h2>
            <span className="text-xs text-slate-500">
              المبالغ بالريال السعودي · سنوياً
            </span>
          </div>
          <FeesTables school={s} />
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            * المصدر: المدرسة. تختلف الرسوم النهائية حسب رسوم التسجيل والكتب
            والنقل وسنة الالتحاق. يُنصح بالتأكيد مع المدرسة قبل التسجيل.
          </p>
        </section>
      )}

      {/* Extra services (admin, transport, uniform, …) */}
      {s.services && s.services.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            خدمات إضافية ورسوم
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">الخدمة</th>
                  <th className="px-3 py-2 text-left font-medium tabular-nums">المبلغ</th>
                  <th className="px-3 py-2 text-center font-medium">اختيارية؟</th>
                  <th className="px-3 py-2 text-center font-medium">دفعة واحدة؟</th>
                </tr>
              </thead>
              <tbody>
                {s.services.map((sv, i) => (
                  <tr
                    key={`${sv.label ?? "?"}-${i}`}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-3 py-2 text-slate-700">{sv.label ?? "—"}</td>
                    <td className="px-3 py-2 text-left font-semibold text-slate-900 tabular-nums">
                      {sv.amount ? formatSAR(sv.amount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {sv.isOptional ? "نعم" : "لا"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {sv.oneTime ? "نعم" : "لا"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Facilities */}
      {s.facilities && s.facilities.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            مرافق المدرسة
          </h2>
          <div className="flex flex-wrap gap-2">
            {s.facilities.map((f) => (
              <span
                key={f}
                className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg text-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Discounts */}
      {s.discounts && s.discounts.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            خصومات
          </h2>
          <div className="flex flex-wrap gap-2">
            {s.discounts.map((d, i) => (
              <span
                key={`${d.label ?? "?"}-${i}`}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm"
              >
                {d.label ?? "خصم"}
                {d.pct !== undefined && d.pct !== null
                  ? ` — ${d.pct}%`
                  : d.amount !== undefined && d.amount !== null
                    ? ` — ${formatSAR(d.amount)}`
                    : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Photo gallery (multiple photos) */}
      {s.photos && s.photos.length > 1 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">
            صور المدرسة ({s.photos.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {s.photos.slice(0, 24).map((p, i) => {
              const url = p.originalUrl;
              if (!url) return null;
              return (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Map (only if coords) */}
      {hasCoords && (
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
      )}

      {/* Share + source attribution */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-lg text-slate-900 mb-4">شارك أو تابع</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <ShareButton
            href={`https://wa.me/?text=${encodeURIComponent(s.name + " — " + shareUrl)}`}
            color="bg-emerald-600 hover:bg-emerald-700"
            label="واتساب"
            icon="📱"
          />
          <ShareButton
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(s.name)}&url=${encodeURIComponent(shareUrl)}`}
            color="bg-sky-500 hover:bg-sky-600"
            label="تويتر / X"
            icon="🐦"
          />
          <ShareButton
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            color="bg-blue-700 hover:bg-blue-800"
            label="فيسبوك"
            icon="📘"
          />
          <ShareButton
            href={`mailto:?subject=${encodeURIComponent(s.name)}&body=${encodeURIComponent(shareUrl)}`}
            color="bg-slate-600 hover:bg-slate-700"
            label="إيميل"
            icon="✉️"
          />
        </div>
        {(s.sources && s.sources.length > 0) || s.sourceUrl ? (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">مصادر البيانات:</span>
            {s.sources?.map((src) => (
              <span
                key={src}
                className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
              >
                {src === "yaschools" ? "yaschools.com"
                  : src === "madares" ? "parents.madares.sa"
                  : src === "ssg" ? "saudischoolsguide.com"
                  : src === "mdaresai" ? "mdares.ai"
                  : src}
              </span>
            ))}
            {s.sourceUrl && (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:underline mr-auto"
              >
                المصدر الأصلي ←
              </a>
            )}
          </div>
        ) : null}
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

// ---------- Helpers ----------

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm">
      {children}
    </span>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span aria-hidden className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-slate-800 font-medium">{children}</div>
      </div>
    </div>
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

function ShareButton({
  href,
  color,
  label,
  icon,
}: {
  href: string;
  color: string;
  label: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${color} text-white text-sm font-semibold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 transition`}
    >
      <span>{icon}</span>
      {label}
    </a>
  );
}

const STAGE_COLORS: Record<string, string> = {
  روضة: "bg-amber-50 text-amber-800 border-amber-200",
  ابتدائي: "bg-teal-50 text-teal-800 border-teal-200",
  متوسط: "bg-blue-50 text-blue-800 border-blue-200",
  ثانوي: "bg-indigo-50 text-indigo-800 border-indigo-200",
  أخرى: "bg-slate-50 text-slate-700 border-slate-200",
};

function FeesTables({ school }: { school: School }) {
  if (!school.gradeFees || school.gradeFees.length === 0) return null;

  // Group: track → grade → { Boys?, Girls? }
  type Row = { grade: string; gradeAr: string; stage: string; boys?: number; girls?: number };
  const byTrack: Record<string, { trackAr: string; rows: Map<string, Row> }> = {};

  for (const f of school.gradeFees) {
    const trackKey = f.track ?? "General";
    const trackArLabel = f.trackAr ?? "المسار العام";
    const tk = byTrack[trackKey] ?? { trackAr: trackArLabel, rows: new Map() };
    byTrack[trackKey] = tk;
    const existing =
      tk.rows.get(f.grade) ??
      ({
        grade: f.grade,
        gradeAr: f.gradeAr ?? f.grade,
        stage: f.stage,
      } as Row);
    if (f.gender === "Boys") existing.boys = f.amount;
    else if (f.gender === "Girls") existing.girls = f.amount;
    else existing.boys = existing.boys ?? f.amount;   // unknown gender → put in boys col
    tk.rows.set(f.grade, existing);
  }

  // Track display order: General first, then alpha
  const trackKeys = Object.keys(byTrack).sort((a, b) => {
    if (a === "General") return -1;
    if (b === "General") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {trackKeys.map((trackKey) => {
        const { trackAr, rows } = byTrack[trackKey];
        // Group rows by stage in order: روضة → ابتدائي → متوسط → ثانوي → أخرى
        const stageOrder = ["روضة", "ابتدائي", "متوسط", "ثانوي", "أخرى"];
        const allRows = Array.from(rows.values()).sort((a, b) => {
          const sa = stageOrder.indexOf(a.stage);
          const sb = stageOrder.indexOf(b.stage);
          if (sa !== sb) return sa - sb;
          // Within stage, by grade number
          return gradeNum(a.grade) - gradeNum(b.grade);
        });

        const hasBoys = allRows.some((r) => r.boys !== undefined);
        const hasGirls = allRows.some((r) => r.girls !== undefined);

        // Find stage min/max for the header summary
        return (
          <div key={trackKey} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>المسار: {trackAr}</span>
              <span className="text-xs text-slate-500">
                {allRows.length} {allRows.length === 1 ? "صف" : "صف"}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">المرحلة</th>
                  <th className="px-3 py-2 text-right font-medium">الصف</th>
                  {hasBoys && (
                    <th className="px-3 py-2 text-left font-medium tabular-nums">
                      بنين
                    </th>
                  )}
                  {hasGirls && (
                    <th className="px-3 py-2 text-left font-medium tabular-nums">
                      بنات
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {allRows.map((r, i) => (
                  <tr
                    key={r.grade}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md border ${STAGE_COLORS[r.stage] ?? STAGE_COLORS["أخرى"]}`}
                      >
                        {r.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.gradeAr}</td>
                    {hasBoys && (
                      <td className="px-3 py-2 text-left font-semibold text-slate-900 tabular-nums">
                        {r.boys !== undefined ? formatSAR(r.boys) : "—"}
                      </td>
                    )}
                    {hasGirls && (
                      <td className="px-3 py-2 text-left font-semibold text-slate-900 tabular-nums">
                        {r.girls !== undefined ? formatSAR(r.girls) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function gradeNum(grade: string): number {
  if (grade === "KG1") return 1;
  if (grade === "KG2") return 2;
  if (grade === "KG3") return 3;
  const m = grade.match(/(\d+)/);
  return m ? 10 + parseInt(m[1], 10) : 999;
}
