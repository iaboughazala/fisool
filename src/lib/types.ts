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

export interface SchoolPhoto {
  localPath?: string;
  originalUrl: string;
}

export interface School {
  id: number;
  slug: string;
  /** Display name — Arabic preferred, falls back to English. */
  name: string;
  nameAr?: string;
  nameEn?: string;
  city?: string;
  cityEn?: string;
  district?: string;
  districtEn?: string;
  lat: number;
  lng: number;
  /** School type, e.g. "أهلية", "عالمية", "حضانة - روضة", "نموذجية". */
  type?: string;
  /** Comma-separated list of curricula, e.g. "أمريكي, بريطاني". */
  curriculum?: string;
  /** Gender: "بنين و بنات" | "بنين" | "بنات". */
  gender?: string;
  /** Comma-separated grade levels, e.g. "جميع المراحل" or "حضانة, روضة, ابتدائى". */
  gradeLevels?: string;
  foundedYear?: number;
  about?: string;
  rating?: number;
  reviewCount?: number;
  /** Single advertised starting fee (SAR). */
  startingFee?: number;
  /** Aggregate of all collected fee rows for this school. */
  fees?: FeesSummary;
  /** Primary photo (logo). */
  photo?: SchoolPhoto;
  /** Sub-category ratings, keyed by Arabic category name. */
  subRatings?: Record<string, number>;
}
