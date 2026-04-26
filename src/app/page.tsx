import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SchoolCard from "@/components/SchoolCard";
import { schools, NEIGHBORHOODS, FEATURED_NEIGHBORHOODS } from "@/lib/schools";

export default function Home() {
  const featured = [...schools]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  return (
    <>
      <section className="relative bg-gradient-to-bl from-teal-600 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
              اعثر على المدرسة المناسبة لطفلك في الرياض
            </h1>
            <p className="text-teal-50 text-lg sm:text-xl mb-8 leading-relaxed">
              دليل شامل وبسيط لمدارس الرياض الأهلية والعالمية. ابحث، قارن،
              واختر بثقة.
            </p>
            <SearchBar size="lg" />
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="text-teal-100">أحياء سريعة:</span>
              {FEATURED_NEIGHBORHOODS.map((n) => (
                <Link
                  key={n}
                  href={`/search?neighborhood=${encodeURIComponent(n)}`}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition"
                >
                  {n}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <Stat value={schools.length.toLocaleString("ar-SA")} label="مدرسة" />
          <Stat value={NEIGHBORHOODS.length.toString()} label="حي" />
          <Stat value="6" label="مناهج" />
          <Stat value="٤" label="مراحل دراسية" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              مدارس مختارة
            </h2>
            <p className="text-slate-600 mt-1">
              الأعلى تقييماً في الرياض حسب معاييرنا
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            ليه فصول؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Feature
              title="بحث ذكي وسريع"
              desc="فلتر بالحي، المنهج، النوع، والمرحلة في ثوانٍ."
              icon="🔍"
            />
            <Feature
              title="معلومات شاملة"
              desc="رسوم، مرافق، مناهج، وموقع — كل ما يهمك في صفحة واحدة."
              icon="📋"
            />
            <Feature
              title="خريطة الرياض"
              desc="شوف مدارس حيك ومدى قربها من البيت أو الشغل."
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
