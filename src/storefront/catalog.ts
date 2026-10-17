import { createContext, useContext } from "react";
import type { OriginalProduct } from "../../shared/storefront";
export { categories } from "./categories";
export type Product = OriginalProduct;
export const CatalogContext = createContext<OriginalProduct[]>([]);
export function useCatalog() {
  return useContext(CatalogContext);
}
export function cdnImage(path: string, width = 800) {
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}&fit=contain`;
}
export function cdnImageSet(path: string) {
  return [320, 480, 640, 800]
    .map((width) => `${cdnImage(path, width)} ${width}w`)
    .join(", ");
}
