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
  source?: string;
  track?: string | null;
  trackAr?: string | null;
  grade: string;
  gradeAr?: string;
  stage: FeeStage;
  gender?: "Boys" | "Girls" | string | null;
  genderAr?: "بنين" | "بنات" | string | null;
  amount: number;
}

export interface SchoolPhoto {
  originalUrl?: string;
  localPath?: string;
  source?: string;
}

export interface SchoolService {
  source?: string;
  label?: string;
  amount?: number;
  isOptional?: boolean;
  oneTime?: boolean;
}

export interface SchoolDiscount {
  source?: string;
  label?: string;
  pct?: number;
  amount?: number;
}

export interface SchoolReview {
  source?: string;
  author?: string;
  rating?: number;
  comment?: string;
  date?: string;
}

export interface SchoolSocialLink {
  source?: string;
  platform?: string;
  url: string;
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
  address?: string;
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
  /** Full foundation date when known (e.g. "2023-01-23"). */
  foundationDate?: string;
  studentCount?: number;
  about?: string;
  rating?: number;
  reviewCount?: number;
  startingFee?: number;
  fees?: FeesSummary;
  gradeFees?: GradeFee[];
  photo?: SchoolPhoto;
  /** Full photo gallery from all sources. */
  photos?: SchoolPhoto[];
  subRatings?: Record<string, number>;
  sourceUrl?: string;

  // --- Contact info ---
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;

  // --- Rich content ---
  facilities?: string[];
  services?: SchoolService[];
  discounts?: SchoolDiscount[];
  accreditations?: string[];
  reviewsList?: SchoolReview[];
  socialLinks?: SchoolSocialLink[];
  profilePdfUrl?: string;
  profilePdfLocalPath?: string;
  videoUrl?: string;
  logoUrl?: string;

  // --- Provenance (which source(s) this school appeared in) ---
  sources?: string[];
  sourcesCount?: number;
}
