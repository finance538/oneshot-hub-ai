import type { Product } from "./catalog";
import type { CatalogCopy as ProductEnglishCopy } from "../../shared/storefront";
export function getLocalizedProductContent(
  product: Product,
  isArabic: boolean,
): ProductEnglishCopy {
  const fallbackDetailedAr =
    (product.publicContent as { detailedDescription?: string })
      .detailedDescription || product.publicContent.shortDescription;
  if (isArabic) {
    return {
      subCategory: product.subCategory,
      shortDescription: product.publicContent.shortDescription,
      detailedDescription: fallbackDetailedAr,
      deliverables: product.publicContent.deliverables,
      exclusions: product.publicContent.exclusions,
      revisionsScope: product.revisions.scope,
      ctaButton: product.publicContent.ctaButton,
    };
  }
  const en = product.english;
  if (en) return en;
  return {
    subCategory: product.subCategory,
    shortDescription: product.publicContent.shortDescription,
    detailedDescription: fallbackDetailedAr,
    deliverables: product.publicContent.deliverables,
    exclusions: product.publicContent.exclusions,
    revisionsScope: product.revisions.scope,
    ctaButton: product.publicContent.ctaButton,
  };
}
