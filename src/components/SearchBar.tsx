"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES } from "@/lib/schools";

export default function SearchBar({ size = "md" }: { size?: "md" | "lg" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    router.push(`/search?${params.toString()}`);
  }

  const padding = size === "lg" ? "p-2" : "p-1.5";
  const inputPadding =
    size === "lg" ? "py-3 px-4 text-base" : "py-2 px-3 text-sm";

  return (
    <form
      onSubmit={submit}
      className={`bg-white rounded-2xl shadow-lg border border-slate-200 ${padding} flex flex-col sm:flex-row gap-2`}
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن اسم مدرسة، حي، أو منهج..."
        className={`flex-1 bg-transparent outline-none rounded-xl ${inputPadding} text-slate-900 placeholder:text-slate-400`}
      />
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className={`bg-slate-50 border border-slate-200 rounded-xl ${inputPadding} text-slate-700 outline-none focus:border-teal-500`}
      >
        <option value="">كل المدن</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl ${inputPadding} px-6 transition shrink-0`}
      >
        بحث
      </button>
    </form>
  );
}
