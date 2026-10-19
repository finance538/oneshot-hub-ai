import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "../../../shared/contracts";
import { api } from "../../lib/api";

export function usePublicCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++generation.current;
    setLoading(true);
    setError(false);
    try {
      const result = await api<{ products: Product[] }>(
        "/api/products",
        undefined,
        { quiet: true },
      );
      if (seq === generation.current) setProducts(result.products);
    } catch {
      if (seq === generation.current) setError(true);
    } finally {
      if (seq === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { products, loading, error, reload };
}
