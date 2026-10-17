export interface CatalogCopy {
  subCategory: string;
  shortDescription: string;
  detailedDescription: string;
  deliverables: string[];
  exclusions: string[];
  revisionsScope: string;
  ctaButton: string;
}
export interface OriginalProduct {
  sortOrder: number;
  sku: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  subCategory: string;
  status: string;
  pricing: {
    amount: number;
    currency: string;
    type: string;
    billingCycle: string;
  };
  deliveryDays: number;
  revisions: { count: number; scope: string };
  publicContent: {
    shortDescription: string;
    detailedDescription?: string;
    targetAudience?: string;
    problemSolved?: string;
    expectedOutcome?: string;
    deliverables: string[];
    exclusions: string[];
    ctaButton: string;
    seo?: { title: string; description: string };
  };
  english?: CatalogCopy;
  image: string;
  sourceKind: "catalog" | "media" | "ads";
  media?: {
    sku: string;
    image: string;
    price: number;
    days: number;
    nameAr: string;
    nameEn: string;
    badgeAr: string;
    badgeEn: string;
    descriptionAr: string;
    descriptionEn: string;
  };
}
