import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SchoolCard from "@/components/SchoolCard";
import {
  schools,
  CITIES,
  CITIES_BY_COUNT,
  FEATURED_CITIES,
  TYPES,
} from "@/lib/schools";

export default function Home() {
  // Featured: top-rated schools with photos and a meaningful review count.
  const featured = [...schools]
    .filter(
      (s) => s.photo && s.rating && s.rating >= 4 && (s.reviewCount ?? 0) >= 5,
    )
    .sort((a, b) => {
      // Score by rating × log(reviews) so popular AND highly-rated rise.
      const sa = (a.rating ?? 0) * Math.log((a.reviewCount ?? 0) + 1);
      const sb = (b.rating ?? 0) * Math.log((b.reviewCount ?? 0) + 1);
      return sb - sa;
    })
    .slice(0, 6);

  const typeCount: Record<string, number> = {};
  for (const s of schools) if (s.type) typeCount[s.type] = (typeCount[s.type] ?? 0) + 1;

  return (
    <>
      <section className="relative bg-gradient-to-bl from-teal-600 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
              اعثر على المدرسة المناسبة لطفلك في المملكة
            </h1>
            <p className="text-teal-50 text-lg sm:text-xl mb-8 leading-relaxed">
              دليل شامل لأكثر من{" "}
              {schools.length.toLocaleString("ar-SA")} مدرسة سعودية
              بتقييمات حقيقية، رسوم، وموقع. ابحث وقارن واختر بثقة.
            </p>
            <SearchBar size="lg" />
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="text-teal-100">مدن سريعة:</span>
              {FEATURED_CITIES.map((c) => (
                <Link
                  key={c}
                  href={`/search?city=${encodeURIComponent(c)}`}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <Stat value={schools.length.toLocaleString("ar-SA")} label="مدرسة" />
          <Stat value={CITIES.length.toLocaleString("ar-SA")} label="مدينة" />
          <Stat
            value={(typeCount["أهلية"] ?? 0).toLocaleString("ar-SA")}
            label="مدرسة أهلية"
          />
          <Stat
            value={(typeCount["عالمية"] ?? 0).toLocaleString("ar-SA")}
            label="مدرسة عالمية"
          />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              مدارس مميزة
            </h2>
            <p className="text-slate-600 mt-1">
              الأعلى تقييماً عبر مدن المملكة
            </p>
          </div>
          <Link
            href="/search"
            className="text-teal-700 hover:text-teal-900 font-semibold text-sm"
          >
            عرض الكل ←
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((s) => (
            <SchoolCard key={s.id} school={s} />
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3">
            تصفّح حسب المدينة
          </h2>
          <p className="text-slate-600 text-center mb-10">
            {CITIES.length.toLocaleString("ar-SA")} مدينة في الدليل
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CITIES_BY_COUNT.map(({ city, count }) => (
              <Link
                key={city}
                href={`/search?city=${encodeURIComponent(city)}`}
                className="flex items-center justify-between bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl px-4 py-3 transition"
              >
                <span className="font-semibold">{city}</span>
                <span className="text-sm text-slate-500">
                  {count.toLocaleString("ar-SA")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            ليه فصول؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Feature
              title="بحث ذكي وسريع"
              desc="فلتر بالمدينة، الحي، المنهج، النوع، والمرحلة في ثوانٍ."
              icon="🔍"
            />
            <Feature
              title="تقييمات حقيقية"
              desc="آلاف التقييمات الفعلية من أولياء الأمور — مش أرقام مزيّفة."
              icon="⭐"
            />
            <Feature
              title="خريطة شاملة"
              desc="كل المدارس على خريطة تفاعلية واحدة لكل المملكة."
              icon="🗺️"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold text-teal-700">
        {value}
      </div>
      <div className="text-sm text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function Feature({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
