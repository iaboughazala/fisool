import { schools, CITIES } from "@/lib/schools";

export const metadata = {
  title: "عن فصول",
  description: "تعرف على فصول، الدليل البسيط لمدارس المملكة العربية السعودية.",
};

export default function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 leading-loose">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">عن فصول</h1>
      <p className="text-slate-700 mb-4">
        فصول هو دليل بسيط ومركّز لمدارس المملكة العربية السعودية، صُنع لمساعدة
        أولياء الأمور في اتخاذ قرار اختيار المدرسة بثقة وسرعة.
      </p>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
        المشكلة اللي نحلها
      </h2>
      <p className="text-slate-700 mb-4">
        المنصات الموجودة عادةً معقدة وفيها معلومات كثيرة تشتت ولي الأمر. نحن
        نختصر القصة في صفحة واحدة لكل مدرسة، مع بحث سريع وخريطة واضحة وتقييمات
        حقيقية.
      </p>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">إحصائيات الدليل</h2>
      <ul className="list-disc list-inside text-slate-700 space-y-2 mb-6">
        <li>{schools.length.toLocaleString("ar-SA")} مدرسة في كل أنحاء المملكة</li>
        <li>{CITIES.length.toLocaleString("ar-SA")} مدينة سعودية</li>
        <li>
          {schools
            .filter((s) => (s.reviewCount ?? 0) > 0)
            .reduce((acc, s) => acc + (s.reviewCount ?? 0), 0)
            .toLocaleString("ar-SA")}{" "}
          تقييم من أولياء الأمور
        </li>
      </ul>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">رؤيتنا</h2>
      <ul className="list-disc list-inside text-slate-700 space-y-2">
        <li>تغطية شاملة لكل مدن المملكة</li>
        <li>تقييمات وأسعار حقيقية — مش أرقام مفبركة</li>
        <li>واجهة بسيطة وسريعة بدون تعقيد</li>
        <li>محتوى عربي قوي محسّن لمحركات البحث</li>
        <li>مساعد توصية ذكي (قريباً)</li>
      </ul>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">عن البيانات</h2>
      <p className="text-slate-700 text-sm">
        البيانات المعروضة (الأسماء، التقييمات، الرسوم، الإحداثيات) مجموعة من
        مصادر عامة وتُحدَّث دورياً. يُنصح دائماً بالتواصل مع المدرسة مباشرةً
        لتأكيد التفاصيل قبل اتخاذ قرار التسجيل.
      </p>
    </article>
  );
}
