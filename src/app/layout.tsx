import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "فيصول | دليل مدارس الرياض",
    template: "%s | فيصول",
  },
  description:
    "دليل شامل وبسيط لمدارس الرياض الأهلية والعالمية. ابحث، قارن، واختر المدرسة المناسبة لطفلك.",
  keywords: [
    "مدارس الرياض",
    "مدارس أهلية الرياض",
    "مدارس عالمية الرياض",
    "دليل المدارس",
    "اختيار مدرسة",
  ],
  openGraph: {
    title: "فيصول | دليل مدارس الرياض",
    description: "ابحث، قارن، واختر المدرسة المناسبة لطفلك في الرياض.",
    locale: "ar_SA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
