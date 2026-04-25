import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex w-9 h-9 rounded-xl bg-teal-600 text-white items-center justify-center font-bold text-lg">
            ف
          </span>
          <span className="text-xl font-bold text-slate-900">فيصول</span>
          <span className="hidden sm:inline text-xs text-slate-500 mr-1">
            دليل مدارس الرياض
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4 text-sm">
          <Link
            href="/search"
            className="px-3 py-2 rounded-lg hover:bg-slate-100 transition"
          >
            بحث
          </Link>
          <Link
            href="/map"
            className="px-3 py-2 rounded-lg hover:bg-slate-100 transition"
          >
            الخريطة
          </Link>
          <Link
            href="/about"
            className="hidden sm:inline px-3 py-2 rounded-lg hover:bg-slate-100 transition"
          >
            عن الموقع
          </Link>
        </nav>
      </div>
    </header>
  );
}
