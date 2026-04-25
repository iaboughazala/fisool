import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSchoolBySlug, getAllSlugs, formatFees, schools } from "@/lib/schools";
import SchoolCard from "@/components/SchoolCard";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getSchoolBySlug(slug);
  if (!s) return { title: "المدرسة غير موجودة" };
  return {
    title: s.name,
    description: s.description,
    openGraph: {
      title: s.name,
      description: s.description,
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
    .filter((x) => x.id !== s.id && x.neighborhood === s.neighborhood)
    .slice(0, 3);

  return (
    <article className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-teal-700">
          الرئيسية
        </Link>
        <span>/</span>
        <Link
          href={`/search?neighborhood=${encodeURIComponent(s.neighborhood)}`}
          className="hover:text-teal-700"
        >
          {s.neighborhood}
        </Link>
        <span>/</span>
        <span className="text-slate-700">{s.name}</span>
      </nav>

      {/* Header */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              {s.name}
            </h1>
            {s.nameEn && (
              <p className="text-slate-500 mb-2" dir="ltr">
                {s.nameEn}
              </p>
            )}
            <p className="text-slate-600">{s.address}</p>
          </div>
          {s.rating && (
            <div className="shrink-0 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-lg font-bold">
              ★ {s.rating.toFixed(1)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Pill>{s.type}</Pill>
          <Pill>{s.curriculum}</Pill>
          <Pill>{s.gender}</Pill>
          {s.stages.map((st) => (
            <Pill key={st}>{st}</Pill>
          ))}
        </div>

        <p className="text-slate-700 leading-loose">{s.description}</p>
      </header>

      {/* Quick facts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <InfoCard label="الرسوم السنوية" value={formatFees(s.feesMin, s.feesMax)} />
        <InfoCard label="الحي" value={s.neighborhood} />
        {s.established && (
          <InfoCard label="سنة التأسيس" value={s.established.toString()} />
        )}
        {s.studentsCount && (
          <InfoCard
            label="عدد الطلاب"
            value={s.studentsCount.toLocaleString("ar-SA")}
          />
        )}
      </div>

      {/* Features */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-lg text-slate-900 mb-4">المرافق والمميزات</h2>
        <div className="flex flex-wrap gap-2">
          {s.features.map((f) => (
            <span
              key={f}
              className="bg-teal-50 text-teal-800 px-3 py-1.5 rounded-lg text-sm"
            >
              ✓ {f}
            </span>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-lg text-slate-900 mb-4">معلومات التواصل</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {s.phone && (
            <a
              href={`tel:${s.phone}`}
              className="flex items-center gap-2 text-slate-700 hover:text-teal-700"
            >
              <span>📞</span>
              <span dir="ltr">{s.phone}</span>
            </a>
          )}
          {s.website && (
            <a
              href={s.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-700 hover:text-teal-700"
            >
              <span>🌐</span>
              <span>زيارة الموقع</span>
            </a>
          )}
          {s.email && (
            <a
              href={`mailto:${s.email}`}
              className="flex items-center gap-2 text-slate-700 hover:text-teal-700"
            >
              <span>✉️</span>
              <span dir="ltr">{s.email}</span>
            </a>
          )}
          <a
            href={`https://maps.google.com/?q=${s.coordinates.lat},${s.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-700 hover:text-teal-700"
          >
            <span>📍</span>
            <span>افتح في خرائط Google</span>
          </a>
        </div>
      </section>

      {/* Map embed */}
      <section className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 overflow-hidden">
        <iframe
          title={`موقع ${s.name}`}
          className="w-full h-72 rounded-xl"
          src={`https://maps.google.com/maps?q=${s.coordinates.lat},${s.coordinates.lng}&z=15&output=embed`}
          loading="lazy"
        />
      </section>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            مدارس قريبة في {s.neighborhood}
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="font-bold text-slate-900 text-lg">{value}</div>
    </div>
  );
}
