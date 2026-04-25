export const metadata = {
  title: "عن فيصول",
  description: "تعرف على فيصول، دليل مدارس الرياض البسيط والشامل.",
};

export default function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 leading-loose">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">عن فيصول</h1>
      <p className="text-slate-700 mb-4">
        فيصول هو دليل بسيط ومركّز على مدارس مدينة الرياض، صُنع لمساعدة أولياء
        الأمور في اتخاذ قرار اختيار المدرسة بثقة وسرعة.
      </p>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
        المشكلة اللي نحلها
      </h2>
      <p className="text-slate-700 mb-4">
        المنصات الموجودة عادةً معقدة وفيها معلومات كثيرة تشتت ولي الأمر. نحن
        نختصر القصة في صفحة واحدة لكل مدرسة، مع بحث سريع وخريطة واضحة.
      </p>
      <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">رؤيتنا</h2>
      <ul className="list-disc list-inside text-slate-700 space-y-2">
        <li>تركيز على الرياض — تغطية عميقة بدلاً من واسعة</li>
        <li>واجهة بسيطة وسريعة بدون تعقيد</li>
        <li>محتوى عربي قوي محسّن لمحركات البحث</li>
        <li>مساعد توصية ذكي (قريباً)</li>
      </ul>
    </article>
  );
}
