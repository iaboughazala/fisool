import type { School } from "./types";
import schoolsRaw from "./data/schools-real.json";

/**
 * Source of truth for the school list.
 * Real data exported from yaschools-style scrape (1,800+ Saudi schools).
 * Re-run `python scripts/export-from-sqlite.py` to refresh.
 */
export const schools: School[] = schoolsRaw as unknown as School[];

// --- Derived facets, computed once at module load ---

function uniqSorted<T>(values: Iterable<T>): T[] {
  return Array.from(new Set(values)).sort((a, b) =>
    String(a).localeCompare(String(b), "ar"),
  );
}

export const CITIES: string[] = uniqSorted(
  schools.map((s) => s.city).filter((v): v is string => !!v),
);

export const DISTRICTS_BY_CITY: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const s of schools) {
    if (!s.city || !s.district) continue;
    (map[s.city] ??= new Set()).add(s.district);
  }
  return Object.fromEntries(
    Object.entries(map).map(([city, set]) => [
      city,
      Array.from(set).sort((a, b) => a.localeCompare(b, "ar")),
    ]),
  );
})();

export const TYPES: string[] = uniqSorted(
  schools.map((s) => s.type).filter((v): v is string => !!v),
);

export const GENDERS: string[] = uniqSorted(
  schools.map((s) => s.gender).filter((v): v is string => !!v),
);

/**
 * Curriculum is stored as a CSV string per school. We split it for filtering UI.
 * Returns the canonical list of distinct curriculum tokens across the dataset.
 */
export const CURRICULA: string[] = uniqSorted(
  schools.flatMap((s) =>
    (s.curriculum ?? "")
      .split(/[,،]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
);

export const GRADE_LEVELS: string[] = uniqSorted(
  schools.flatMap((s) =>
    (s.gradeLevels ?? "")
      .split(/[,،]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
);

/** Cities ranked by school count, used for home-page chips and stats. */
export const CITIES_BY_COUNT: { city: string; count: number }[] = (() => {
  const counts: Record<string, number> = {};
  for (const s of schools) {
    if (s.city) counts[s.city] = (counts[s.city] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
})();

export const FEATURED_CITIES = CITIES_BY_COUNT.slice(0, 8).map((c) => c.city);

// --- Lookups ---

export function getSchoolBySlug(slug: string): School | undefined {
  return schools.find((s) => s.slug === slug);
}

// --- Search ---

export interface SearchFilters {
  q?: string;
  city?: string;
  district?: string;
  type?: string;
  curriculum?: string;
  gender?: string;
  gradeLevel?: string;
  feesMax?: number;
  minRating?: number;
}

export function searchSchools(filters: SearchFilters): School[] {
  return schools.filter((s) => {
    if (filters.q) {
      const q = filters.q.trim().toLowerCase();
      const haystack = `${s.name} ${s.nameEn ?? ""} ${s.city ?? ""} ${s.district ?? ""} ${s.about ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.city && s.city !== filters.city) return false;
    if (filters.district && s.district !== filters.district) return false;
    if (filters.type && s.type !== filters.type) return false;
    if (filters.gender && s.gender && s.gender !== filters.gender) return false;
    if (
      filters.curriculum &&
      !(s.curriculum ?? "").includes(filters.curriculum)
    )
      return false;
    if (
      filters.gradeLevel &&
      !(s.gradeLevels ?? "").includes(filters.gradeLevel)
    )
      return false;
    if (filters.feesMax !== undefined) {
      const lo = s.fees?.min ?? s.startingFee;
      if (lo === undefined || lo > filters.feesMax) return false;
    }
    if (filters.minRating !== undefined) {
      if (!s.rating || s.rating < filters.minRating) return false;
    }
    return true;
  });
}

// --- Formatting ---

export function formatSAR(n: number | undefined): string {
  if (n === undefined || n === null) return "غير متوفرة";
  return `${n.toLocaleString("ar-SA")} ر.س`;
}

export function formatFeeRange(s: School): string {
  if (s.fees) {
    if (s.fees.min === s.fees.max) return formatSAR(s.fees.min);
    return `${formatSAR(s.fees.min)} - ${formatSAR(s.fees.max)}`;
  }
  if (s.startingFee) return `تبدأ من ${formatSAR(s.startingFee)}`;
  return "غير متوفرة";
}

/** Curriculum tokens, split for tag display. */
export function curriculumTokens(s: School): string[] {
  return (s.curriculum ?? "")
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function gradeLevelTokens(s: School): string[] {
  return (s.gradeLevels ?? "")
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
