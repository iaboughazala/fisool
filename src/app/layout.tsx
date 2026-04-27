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
    default: "فصول | دليل المدارس في المملكة العربية السعودية",
    template: "%s | فصول",
  },
  description:
    "دليل شامل لمدارس المملكة العربية السعودية الأهلية والعالمية. أكثر من 1,800 مدرسة بتقييمات حقيقية، رسوم لكل صف، وموقع — ابحث واختر المدرسة المناسبة لطفلك.",
  keywords: [
    "مدارس السعودية",
    "مدارس الرياض",
    "مدارس جدة",
    "مدارس الدمام",
    "مدارس أهلية",
    "مدارس عالمية",
    "دليل المدارس",
    "رسوم المدارس",
  ],
  openGraph: {
    title: "فصول | دليل المدارس في المملكة",
    description: "ابحث، قارن، واختر المدرسة المناسبة لطفلك في كل مدن المملكة.",
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
