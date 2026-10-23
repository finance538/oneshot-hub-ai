import { lazy, Suspense, useMemo, type ReactNode } from "react";
import type { Product } from "../../shared/contracts";
import OriginalStorefront from "../storefront/Storefront";
import { useAppearance } from "../storefront/i18n";
import { CatalogContext } from "../storefront/catalog";
import { documents } from "../storefront/documents";
import { Notice } from "./common";

import type { SessionUser } from "./auth";
import GuidePage from "../growth/GuidePage";
const Workforce = lazy(() => import("../workforce/Workforce"));

export function Store({
  user,
  authReady,
  onWorkforce,
  products,
  loading,
  error,
  onRetry,
  onLogin,
  onOrders,
  accountControl,
}: {
  user: SessionUser | null;
  authReady: boolean;
  onWorkforce: () => void;
  products: Product[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onLogin: () => void;
  onOrders: () => void;
  accountControl: ReactNode;
}) {
  const { tr } = useAppearance();
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
  const isDocument =
    window.location.pathname.replace(/\/+$/, "") === "/api-integration" ||
    Object.hasOwn(documents, window.location.pathname.replace(/^\/|\/$/g, ""));
  const guideSlug = window.location.pathname.match(
    /^\/guides(?:\/([\w-]+))?\/?$/,
  );
  if (guideSlug)
    return (
      <>
        <GuidePage slug={guideSlug[1]} />
      </>
    );
  return (
    <>
      <CatalogContext.Provider value={records}>
        {window.location.pathname.startsWith("/workforce") ? (
          <Suspense
            fallback={
              <p role="status">
                {tr("جارٍ تحميل مساحة الفريق…", "Loading the team workspace…")}
              </p>
            }
          >
            <Workforce
              key={user?.id || "guest"}
              user={user}
              onLogin={onLogin}
              accountControl={accountControl}
            />
          </Suspense>
        ) : !isDocument && (loading || error || !records.length) ? (
          <div className="storefront store-loading">
            <a href="/" className="store-logo">
              <img src="/oneshot.svg" width="44" height="44" alt="" />
              <span>
                one<b>Shot</b>
                <small>Hub</small>
              </span>
            </a>
            <h1>{tr("خدمات ونشوت الأصلية", "OneShot services")}</h1>
            {loading ? (
              <>
                <p role="status">
                  {tr(
                    "جارٍ تحميل الكتالوج من قاعدة البيانات…",
                    "Loading the service catalog…",
                  )}
                </p>
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
                    tr(
                      "الكتالوج غير متاح حالياً. حاول لاحقاً أو تواصل معنا.",
                      "The catalog is currently unavailable. Try again later or contact us.",
                    )}
                </Notice>
                <button className="store-button" onClick={onRetry}>
                  {tr("إعادة تحميل الكتالوج", "Reload catalog")}
                </button>
              </>
            )}
            <a href="/support">{tr("الدعم والتواصل", "Support & contact")}</a>
          </div>
        ) : (
          <OriginalStorefront
            signedIn={!!user}
            authReady={authReady}
            onWorkforce={onWorkforce}
            onLogin={onLogin}
            onOrders={onOrders}
            accountControl={accountControl}
          />
        )}
      </CatalogContext.Provider>
    </>
  );
}
