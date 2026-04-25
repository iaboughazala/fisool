import Link from "next/link";
import {
  searchSchools,
  NEIGHBORHOODS,
  CURRICULA,
  GENDERS,
  STAGES,
  TYPES,
} from "@/lib/schools";
import SchoolCard from "@/components/SchoolCard";

export const metadata = {
  title: "بحث المدارس",
  description: "ابحث في مدارس الرياض بالحي، المنهج، المرحلة، والنوع.",
};

type SearchParams = {
  q?: string;
  neighborhood?: string;
  type?: string;
  curriculum?: string;
  gender?: string;
  stage?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const results = searchSchools(sp);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
        بحث المدارس
      </h1>
      <p className="text-slate-600 mb-6">
        فلتر النتائج للوصول للمدرسة المناسبة لطفلك
      </p>

      <form
        method="GET"
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <Field label="بحث">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="اسم مدرسة..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
        </Field>
        <Field label="الحي">
          <Select name="neighborhood" value={sp.neighborhood} options={NEIGHBORHOODS} />
        </Field>
        <Field label="نوع المدرسة">
          <Select name="type" value={sp.type} options={TYPES} />
        </Field>
        <Field label="المنهج">
          <Select name="curriculum" value={sp.curriculum} options={CURRICULA} />
        </Field>
        <Field label="النوع">
          <Select name="gender" value={sp.gender} options={GENDERS} />
        </Field>
        <Field label="المرحلة">
          <Select name="stage" value={sp.stage} options={STAGES} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg py-2.5 px-6 transition"
          >
            تطبيق الفلاتر
          </button>
          <Link
            href="/search"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg py-2.5 px-6 transition"
          >
            إعادة تعيين
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-700">
          <span className="font-bold text-teal-700">
            {results.length.toLocaleString("ar-SA")}
          </span>{" "}
          مدرسة
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg mb-2">
            ما لقينا مدارس تطابق الفلاتر
          </p>
          <Link
            href="/search"
            className="text-teal-700 hover:text-teal-900 font-semibold"
          >
            امسح الفلاتر وابحث من جديد
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((s) => (
            <SchoolCard key={s.id} school={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  name,
  value,
  options,
}: {
  name: string;
  value?: string;
  options: readonly string[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
    >
      <option value="">الكل</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
