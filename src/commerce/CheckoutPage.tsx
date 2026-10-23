import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Order, Product } from "../../shared/contracts";
import { instantCheckout } from "../../shared/commerce";
import { useAuth, type SessionUser } from "../components/auth";
import { api, money, orderLabel } from "../lib/api";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { getLocalizedProductContent } from "../storefront/catalog-en";
import BusinessFooter from "../hub/experience/BusinessFooter";
import { CustomerJourney, PriceBadge } from "./Journey";
import { requestQuote } from "./events";
type Offer = {
  reference: string;
  serviceName: string;
  amountCents: number;
  currency: string;
  scope: string;
  expiresAt: string;
};
export default function CheckoutPage() {
  const auth = useAuth();
  const { tr } = useAppearance();
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.append(meta);
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.append(referrer);
    return () => {
      meta.remove();
      referrer.remove();
    };
  }, []);
  return (
    <>
      <main className="commerce-page">
        <a href={appearanceLink("/products")}>
          {tr("العودة إلى الخدمات", "Back to services")}
        </a>
        <CustomerJourney />
        {auth.ready ? (
          <Checkout
            key={`${auth.user?.id || "guest"}:${auth.user?.roles?.join(",")}`}
            user={auth.user}
            onLogin={() => auth.openLogin()}
          />
        ) : (
          <p role="status">{tr("التحقق من الجلسة…", "Checking session…")}</p>
        )}
        {auth.control}
        {auth.dialog}
      </main>
      <BusinessFooter />
    </>
  );
}
function Checkout({
  user,
  onLogin,
}: {
  user: SessionUser | null;
  onLogin: () => void;
}) {
  const { tr, language } = useAppearance();
  const offerId = location.pathname.startsWith("/quote/")
    ? location.pathname.split("/")[2]
    : null;
  const sku = new URLSearchParams(location.search).get("service") || "";
  const [product, setProduct] = useState<Product | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const alive = useRef(true),
    sending = useRef(false);
  const operationKey = useRef("");
  const keyName = `oneshot.checkout.${user?.id || "guest"}.${offerId || sku}`;
  useEffect(() => {
    alive.current = true;
    try {
      operationKey.current =
        sessionStorage.getItem(keyName) || crypto.randomUUID();
      sessionStorage.setItem(keyName, operationKey.current);
    } catch {
      operationKey.current = crypto.randomUUID();
    }
    void (
      offerId
        ? api<Offer>(
            `/api/quotes/offers/${encodeURIComponent(offerId)}`,
            undefined,
            { quiet: true },
          ).then((value) => {
            if (alive.current) setOffer(value);
          })
        : api<{ products: Product[] }>("/api/products", undefined, {
            quiet: true,
          }).then((data) => {
            if (!alive.current) return;
            const selected = data.products.find(
              (p) => p.catalogDetails?.sku === sku || p.id === sku,
            );
            if (!selected)
              throw new Error(tr("الخدمة غير متاحة.", "Service unavailable."));
            setProduct(selected);
          })
    )
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
    };
  }, []);
  async function pay() {
    if (sending.current || !user || (!offer && !product)) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ order: Order; error?: string }>(
        "/api/payment/execute",
        offerId
          ? { quoteOffer: offerId, gatewayCode: "stripe" }
          : { productId: product!.id, gatewayCode: "stripe" },
        { idempotencyKey: operationKey.current, quiet: true },
      );
      if (alive.current) {
        setOrder(result.order);
        if (result.error) setError(result.error);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (loading)
    return (
      <p role="status">
        {tr("تحميل النطاق والسعر…", "Loading scope and price…")}
      </p>
    );
  const details = product?.catalogDetails;
  const copy = details
    ? getLocalizedProductContent(details, language === "ar")
    : null;
  const allowed = !!offer || (!!product && instantCheckout(details));
  return (
    <section className="commerce-card">
      <span className="commerce-eyebrow">03 / SECURE CHECKOUT</span>
      <h1>
        {offer?.serviceName ||
          (language === "ar"
            ? product?.name
            : details?.nameEn || product?.name) ||
          tr("مراجعة الطلب", "Review order")}
      </h1>
      {product && <PriceBadge details={details} />}{" "}
      {offer && <p dir="ltr">{offer.reference}</p>}
      {(offer || product) && (
        <h2 dir="ltr">
          {money(
            offer?.amountCents ?? product!.priceCents,
            offer?.currency || product!.currency,
          )}
        </h2>
      )}
      {offer ? (
        <>
          <p className="quote-notes">{offer.scope}</p>
          <p>
            {tr("صالح حتى", "Valid until")}{" "}
            {new Date(offer.expiresAt).toLocaleDateString(language)}
          </p>
          <p>
            {tr(
              "للدفع، استخدم الحساب بالبريد المؤكد الذي أدخلته في طلب العرض.",
              "To pay, use an account with the verified email entered in the quote request.",
            )}
          </p>
        </>
      ) : (
        copy && (
          <>
            <p>{copy.shortDescription}</p>
            <h3>{tr("النطاق والمخرجات", "Scope & deliverables")}</h3>
            <ul>
              {copy.deliverables.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <h3>{tr("غير مشمول", "Exclusions")}</h3>
            <ul>
              {copy.exclusions.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p>{copy.revisionsScope}</p>
            <p>
              {tr("التسليم بأيام العمل:", "Delivery in business days:")}{" "}
              {details?.deliveryDays}
            </p>
          </>
        )
      )}
      <div
        className="commerce-merchant-entity"
        style={{
          padding: "0.75rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "6px",
          margin: "1rem 0",
          fontSize: "0.85rem",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          {tr(
            "الجهة المصدرة: مؤسسة يحيى احمد يحيى الهوساوي للتصوير الفوتوغرافي",
            "Issuing Entity: Yahya Ahmed Yahya Al-Hawsawi Photography Establishment (1ShotCam)",
          )}
        </p>
        <p style={{ margin: "0.25rem 0 0 0", opacity: 0.8 }} dir="ltr">
          CR / UNN: 7038244914 · finance@1shotcam.com
          <br />
          {tr("تاريخ الإصدار: 06/02/2024 · نشط", "Issued: 06/02/2024 · Active")}
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      {error && !offer && !product && (
        <p>
          {tr(
            "إذا بدأت الدفع سابقاً، راجع طلبات حسابك لاستعادة الحالة حتى لو انتهت صلاحية العرض.",
            "If you previously started checkout, open your account orders to recover its status even if the offer has expired.",
          )}{" "}
          <a href={appearanceLink("/?module=gateway")}>
            {tr("متابعة طلباتي", "View my orders")}
          </a>
        </p>
      )}
      {order ? (
        <div className="quote-scope" role="status">
          <strong>{orderLabel(order.status)}</strong>
          <p dir="ltr">#{order.id}</p>
          {order.checkoutUrl &&
            ["awaiting_payment", "unconfirmed"].includes(order.status) && (
              <a
                className="button primary"
                href={order.checkoutUrl}
                rel="noreferrer"
              >
                {tr(
                  "الانتقال إلى صفحة الدفع الآمنة",
                  "Continue to secure checkout",
                )}
              </a>
            )}
          <a
            className="button subtle"
            href={appearanceLink(`/?order=${order.id}`)}
          >
            {tr("متابعة حالة الطلب", "Check order status")}
          </a>
          {!offerId && ["paid", "failed"].includes(order.status) && (
            <button
              className="button subtle"
              onClick={() => {
                operationKey.current = crypto.randomUUID();
                try {
                  sessionStorage.setItem(keyName, operationKey.current);
                } catch {
                  /* In-page recovery remains available. */
                }
                setOrder(null);
                setError("");
              }}
            >
              {tr("طلب جديد لنفس الخدمة", "New order for this service")}
            </button>
          )}
          <p>
            {tr(
              "يُثبت الدفع من الخادم بعد التحقق من المزود. فتح صفحة الدفع لا يعني اكتماله.",
              "Payment is confirmed by the server after provider verification. Opening checkout does not confirm payment.",
            )}
          </p>
        </div>
      ) : allowed ? (
        !user ? (
          <button className="button primary" onClick={onLogin}>
            {tr("سجّل الدخول لإتمام الدفع", "Sign in to pay")}
          </button>
        ) : (
          <form
            className="commerce-form"
            onSubmit={(e) => {
              e.preventDefault();
              void pay();
            }}
          >
            <label className="commerce-check">
              <input type="checkbox" required disabled={busy} />
              {tr(
                "راجعت النطاق والمبلغ وسياسة الاسترجاع.",
                "I reviewed the scope, amount and refund policy.",
              )}
            </label>
            <a
              href={appearanceLink("/refund")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("سياسة الاسترجاع", "Refund policy")}
            </a>
            <button className="button primary" disabled={busy}>
              <ShieldCheck size={17} />
              {busy
                ? tr("التحقق من طلب الدفع…", "Checking payment request…")
                : error
                  ? tr(
                      "استعادة نفس طلب الدفع",
                      "Recover the same payment request",
                    )
                  : tr("ادفع بأمان", "Pay securely")}
            </button>
            {error && (
              <p>
                {tr(
                  "لا تنشئ طلباً جديداً إذا كانت النتيجة غير مؤكدة. استخدم نفس الزر لاستعادة الطلب دون تكرار الخصم.",
                  "For an unknown outcome, use the same button to recover the order without creating a duplicate charge.",
                )}
              </p>
            )}
          </form>
        )
      ) : (
        product && (
          <button
            className="button primary"
            onClick={() => requestQuote({ productId: product.id })}
          >
            {tr("طلب عرض سعر", "Request a quote")}
          </button>
        )
      )}
    </section>
  );
}
