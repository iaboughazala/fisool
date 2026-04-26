export type SchoolType = "أهلية" | "عالمية" | "حكومية";
export type Curriculum =
  | "سعودي"
  | "أمريكي"
  | "بريطاني"
  | "IB"
  | "كندي"
  | "ثنائي اللغة";
export type Gender = "بنين" | "بنات" | "مختلط";
export type Stage = "روضة" | "ابتدائي" | "متوسط" | "ثانوي";

export interface GradeFee {
  stage: Stage;
  grade: string;
  fee: number;
}

export interface School {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  neighborhood: string;
  address: string;
  type: SchoolType;
  curriculum: Curriculum;
  gender: Gender;
  stages: Stage[];
  feesMin: number;
  feesMax: number;
  phone?: string;
  website?: string;
  email?: string;
  coordinates: { lat: number; lng: number };
  features: string[];
  rating?: number;
  description: string;
  established?: number;
  studentsCount?: number;
}
