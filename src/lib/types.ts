export interface FeesSummary {
  min: number;
  max: number;
  median: number;
  count: number;
  boysMin?: number;
  boysMax?: number;
  girlsMin?: number;
  girlsMax?: number;
}

export type FeeStage = "روضة" | "ابتدائي" | "متوسط" | "ثانوي" | "أخرى";

/** A real per-grade × per-track × per-gender fee row from the source DB. */
export interface GradeFee {
  /** Source-language track, e.g. "General", "Global American". */
  track: string;
  /** Localised track label. */
  trackAr: string;
  /** Source-language grade, e.g. "GRADE 1", "KG2". */
  grade: string;
  /** Localised grade label, e.g. "الأول الابتدائي". */
  gradeAr: string;
  /** Pedagogical stage, used for grouping in UI. */
  stage: FeeStage;
  gender: "Boys" | "Girls";
  genderAr: "بنين" | "بنات";
  amount: number;
}

export interface SchoolPhoto {
  originalUrl: string;
}

export interface School {
  id: number;
  slug: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  city?: string;
  cityEn?: string;
  district?: string;
  districtEn?: string;
  /** Coordinates may be missing — those schools don't appear on the map. */
  lat?: number;
  lng?: number;
  type?: string;
  curriculum?: string;
  gender?: string;
  gradeLevels?: string;
  foundedYear?: number;
  about?: string;
  rating?: number;
  reviewCount?: number;
  startingFee?: number;
  /** Aggregate of all collected fee rows. */
  fees?: FeesSummary;
  /** Full per-grade × per-track × per-gender fee schedule. */
  gradeFees?: GradeFee[];
  photo?: SchoolPhoto;
  subRatings?: Record<string, number>;
  /** Original source page URL (yaschools.com), shown as attribution. */
  sourceUrl?: string;
}
