# فصول | Fusool

دليل بسيط وشامل لمدارس الرياض الأهلية والعالمية. يساعد أولياء الأمور في اختيار المدرسة المناسبة لأبنائهم بسهولة.

🌐 **Live**: https://fisool.finalizat.com

## الـ Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Leaflet** للخريطة (مجاني، بدون API key)
- **Cairo** كخط عربي

## التشغيل محلياً

```bash
npm install
npm run dev
```

افتح http://localhost:3000

## البناء

```bash
npm run build
npm start
```

## النشر

النسخة المنشورة على VPS (`77.37.51.18`) على port `3004`، خلف Nginx reverse proxy، يديرها PM2.

```bash
ssh root@77.37.51.18
cd /var/www/fisool
git pull
npm install
npm run build
pm2 restart fisool
```

## هيكل المشروع

```
src/
  app/
    page.tsx              الصفحة الرئيسية
    search/page.tsx       صفحة البحث + الفلاتر
    map/page.tsx          الخريطة التفاعلية
    schools/[slug]/       صفحة تفاصيل المدرسة
    about/page.tsx
  components/             Header, Footer, SchoolCard, SearchBar, MapView
  lib/
    schools.ts            بيانات المدارس + دوال البحث
    types.ts
```

## بيانات المدارس

حالياً البيانات في `src/lib/schools.ts` (seed يدوي لـ 40 مدرسة في 22 حي). كل مدرسة لها رسوم لكل صف (KG1 → الثالث الثانوي) تُحسب تلقائياً من نطاق المدرسة عبر `generateGradeFees`. الخطوة القادمة: نقل لقاعدة بيانات (Postgres) لما العدد يكبر، ورسوم فعلية لكل صف بدلاً من المُحسَوبة.

## الـ Roadmap

- [x] MVP: بحث + تفاصيل + خريطة
- [ ] صفحة مقارنة بين 2-3 مدارس
- [ ] مساعد ذكي يقترح مدارس (Claude API)
- [ ] لوحة تحكم للمدارس (إضافة/تحديث بياناتها)
- [ ] قاعدة بيانات Postgres
- [ ] محتوى عربي SEO (مقالات وأدلة)
