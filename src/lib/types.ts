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

export interface GradeFee {
  track: string;
  trackAr: string;
  grade: string;
  gradeAr: string;
  stage: FeeStage;
  gender: "Boys" | "Girls";
  genderAr: "بنين" | "بنات";
  amount: number;
}

export interface SchoolPhoto {
  originalUrl: string;
}

/** The five canonical Saudi school stages, in order. */
export const STAGE_NAMES = [
  "حضانة",
  "روضة",
  "ابتدائي",
  "متوسط",
  "ثانوي",
] as const;
export type StageName = (typeof STAGE_NAMES)[number];

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
  lat?: number;
  lng?: number;
  type?: string;
  /** Curriculum tokens (already split, normalized, deduped). */
  curriculum?: string[];
  gender?: string;
  /** Canonical Saudi school stages (subset of STAGE_NAMES). */
  gradeLevels?: StageName[];
  /** Original unparsed grade-levels string from the source — kept for debugging. */
  gradeLevelsRaw?: string;
  foundedYear?: number;
  about?: string;
  rating?: number;
  reviewCount?: number;
  startingFee?: number;
  fees?: FeesSummary;
  gradeFees?: GradeFee[];
  photo?: SchoolPhoto;
  subRatings?: Record<string, number>;
  sourceUrl?: string;
}
