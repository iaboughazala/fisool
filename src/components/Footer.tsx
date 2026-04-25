export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          © {new Date().getFullYear()} فيصول — دليل مدارس الرياض
        </div>
        <div className="text-slate-500">
          صُنع بحب لأولياء الأمور في الرياض
        </div>
      </div>
    </footer>
  );
}
