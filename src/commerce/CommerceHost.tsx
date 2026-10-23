import { lazy, Suspense, useEffect, useState } from "react";
import { appearanceLink } from "../storefront/i18n";
import type { QuoteIntent } from "./events";
const QuoteFlow = lazy(() => import("./QuoteFlow"));
export default function CommerceHost() {
  const [intent, setIntent] = useState<QuoteIntent | null>(null);
  useEffect(() => {
    const quote = (e: Event) =>
      setIntent((e as CustomEvent<QuoteIntent>).detail || {});
    const checkout = (e: Event) =>
      location.assign(
        appearanceLink(
          `/checkout?service=${encodeURIComponent((e as CustomEvent<{ sku: string }>).detail.sku)}`,
        ),
      );
    window.addEventListener("oneshot:quote", quote);
    window.addEventListener("oneshot:checkout", checkout);
    const params = new URLSearchParams(location.search);
    if (params.get("quote") === "1")
      setIntent({ sku: params.get("service") || undefined });
    return () => {
      window.removeEventListener("oneshot:quote", quote);
      window.removeEventListener("oneshot:checkout", checkout);
    };
  }, []);
  return intent ? (
    <Suspense fallback={<p role="status">OneShot…</p>}>
      <QuoteFlow intent={intent} onClose={() => setIntent(null)} />
    </Suspense>
  ) : null;
}
