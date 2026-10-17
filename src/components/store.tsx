import { useMemo, type ReactNode } from "react";
import type { Product } from "../../shared/contracts";
import OriginalStorefront from "../storefront/Storefront";
import { AppearanceProvider } from "../storefront/i18n";
import { CatalogContext } from "../storefront/catalog";
import { documents } from "../storefront/documents";
import { Notice } from "./common";

export function Store({
  products,
  loading,
  error,
  onRetry,
  onLogin,
  onOrders,
  accountControl,
}: {
  products: Product[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onLogin: () => void;
  onOrders: () => void;
  accountControl: ReactNode;
}) {
  const records = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            (a.catalogDetails?.sortOrder ?? 999) -
            (b.catalogDetails?.sortOrder ?? 999),
        )
        .flatMap((row) =>
          row.catalogDetails
            ? [
                {
                  ...row.catalogDetails,
                  nameAr: row.name,
                  image: row.image || row.catalogDetails.image,
                  pricing: {
                    ...row.catalogDetails.pricing,
                    amount: row.priceCents / 100,
                    currency: row.currency,
                  },
                  ...(row.catalogDetails.media
                    ? {
                        media: {
                          ...row.catalogDetails.media,
                          price: row.priceCents / 100,
                        },
                      }
                    : {}),
                },
              ]
            : [],
        ),
    [products],
  );
  const isDocument = Object.hasOwn(
    documents,
    window.location.pathname.replace(/^\/|\/$/g, ""),
  );
  return (
    <AppearanceProvider>
      <CatalogContext.Provider value={records}>
        {!isDocument && (loading || error || !records.length) ? (
          <div className="storefront store-loading">
            <a href="/" className="store-logo">
              <img src="/oneshot.svg" width="44" height="44" alt="" />
              <span>
                one<b>Shot</b>
                <small>Brand Studio</small>
              </span>
            </a>
            <h1>خدمات ونشوت الأصلية</h1>
            {loading ? (
              <>
                <p role="status">جارٍ تحميل الكتالوج من قاعدة البيانات…</p>
                <div className="store-loading-grid" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Notice>
                  {error ||
                    "الكتالوج الأصلي غير متاح بعد. تظهر المنتجات بعد تطبيق ترحيل الكتالوج أثناء النشر."}
                </Notice>
                <button className="store-button" onClick={onRetry}>
                  إعادة تحميل الكتالوج
                </button>
              </>
            )}
            <a href="/support">الدعم والتواصل</a>
          </div>
        ) : (
          <OriginalStorefront
            onLogin={onLogin}
            onOrders={onOrders}
            accountControl={accountControl}
          />
        )}
      </CatalogContext.Provider>
    </AppearanceProvider>
  );
}
