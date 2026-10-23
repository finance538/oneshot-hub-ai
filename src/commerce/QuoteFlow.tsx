import { getLocalizedProductContent } from "../storefront/catalog-en";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, FileCheck2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { api, RequestError } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import type { Product } from "../../shared/contracts";
import { priceKind } from "../../shared/commerce";
import { PriceBadge } from "./Journey";
import type { QuoteIntent } from "./events";

export default function QuoteFlow({
  intent,
  onClose,
}: {
  intent: QuoteIntent;
  onClose: () => void;
}) {
  const { tr, language } = useAppearance();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState(intent.productId || "");
  const [loading, setLoading] = useState(intent.kind !== "pro");
  const [catalogError, setCatalogError] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{
    reference: string;
    createdAt: string;
  } | null>(null);
  const [preferred, setPreferred] = useState(language === "ar" ? "ar" : "en");
  const submission = useRef<{
    key: string;
    body: Record<string, unknown>;
  } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function load() {
    setLoading(true);
    setCatalogError(false);
    try {
      const data = await api<{ products: Product[] }>(
        "/api/products",
        undefined,
        { quiet: true },
      );
      if (!alive.current) return;
      setProducts(data.products);
      setSelected(
        intent.productId ||
          data.products.find((p) => p.catalogDetails?.sku === intent.sku)?.id ||
          "",
      );
      if (
        (intent.productId || intent.sku) &&
        !data.products.some(
          (p) =>
            (!!intent.productId && p.id === intent.productId) ||
            (!!intent.sku && p.catalogDetails?.sku === intent.sku),
        )
      )
        setCatalogError(true);
    } catch {
      if (alive.current) setCatalogError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (intent.kind !== "pro") void load();
  }, []);
  const product = products.find((p) => p.id === selected);
  const scope = product?.catalogDetails
    ? getLocalizedProductContent(product.catalogDetails, language === "ar")
    : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (!submission.current)
      submission.current = {
        key: crypto.randomUUID(),
        body: {
          customerName: form.get("customerName"),
          email: form.get("email"),
          phone: form.get("phone"),
          notes: form.get("notes"),
          website: form.get("website"),
          language: preferred,
          productId: selected || undefined,
          kind: intent.kind || "service",
          toolSlug: intent.toolSlug,
        },
      };
    setBusy(true);
    setError("");
    try {
      const result = await api<{ reference: string; createdAt: string }>(
        "/api/quotes",
        submission.current.body,
        { idempotencyKey: submission.current.key, quiet: true },
      );
      if (alive.current) setReceipt(result);
    } catch (e) {
      if (alive.current) {
        if (
          e instanceof RequestError &&
          e.status >= 400 &&
          e.status < 500 &&
          e.code !== "QUOTE_SUBMISSION_CONFLICT"
        )
          submission.current = null;
        setError((e as Error).message);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal
      title={
        intent.kind === "pro"
          ? tr("استفسار عن توفر Pro", "Request Pro activation")
          : tr("طلب عرض سعر", "Request a quote")
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {receipt ? (
        <div className="quote-success" role="status">
          <CheckCircle2 size={40} />
          <h3>{tr("تم حفظ طلبك", "Your request is saved")}</h3>
          <div className="quote-business-info" style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.5rem 0", lineHeight: 1.5 }}>
            <p style={{ fontWeight: 600, margin: 0 }}>
              {tr(
                "مؤسسة يحيى احمد يحيى الهوساوي للتصوير الفوتوغرافي",
                "Yahya Ahmed Yahya Al-Hawsawi Photography Establishment",
              )}
            </p>
            <p dir="ltr" style={{ margin: "0.2rem 0 0 0" }}>
              CR / UNN: 7038244914 · finance@1shotcam.com
            </p>
          </div>
          <p>{tr("رقم المتابعة", "Your quote reference")}</p>
          <strong dir="ltr">{receipt.reference}</strong>
          <p>{new Date(receipt.createdAt).toLocaleString(language)}</p>
          <p>
            {tr(
              "يراجع الفريق النطاق ويتواصل معك لتأكيد السعر والتسليم. لم يتم خصم أي مبلغ.",
              "Our team reviews the scope and contacts you to confirm pricing and delivery. No payment has been taken.",
            )}
          </p>
          <button className="button primary" onClick={onClose}>
            {tr("تم", "Done")}
          </button>
        </div>
      ) : (
        <form className="commerce-form" onSubmit={submit}>
          <p>
            {intent.kind === "pro"
              ? tr(
                  "التفعيل عبر الإدارة بعد تأكيد التوفر والاستحقاق. هذا استفسار وليس اشتراكاً مدفوعاً.",
                  "Activation is handled by administration after availability and entitlement checks. This is an inquiry, not a paid subscription.",
                )
              : tr(
                  "أرسل نطاق مشروعك واحصل فوراً على رقم متابعة. السعر النهائي يعتمد على مراجعة الفريق.",
                  "Send your project scope and receive a reference immediately. Final pricing follows team review.",
                )}
          </p>
          {intent.kind === "pro" ? (
            <p dir="ltr">Pro · {intent.toolSlug}</p>
          ) : (
            <label>
              {tr("الخدمة أو الباقة", "Service or package")}
              <select
                value={selected}
                disabled={busy || !!submission.current || loading}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">
                  {tr(
                    "مشروع مخصص / استفسار عام",
                    "Custom project / general inquiry",
                  )}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {language === "ar"
                      ? p.name
                      : p.catalogDetails?.nameEn || p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {loading && (
            <p role="status">{tr("تحميل الخدمات…", "Loading services…")}</p>
          )}
          {catalogError && (
            <p role="alert">
              {tr(
                "تعذّر تحديد الخدمة. أعد تحميل الخدمات قبل الإرسال.",
                "Could not load the service. Reload services before submitting.",
              )}{" "}
              <button type="button" onClick={() => void load()}>
                {tr("إعادة التحميل", "Reload")}
              </button>
            </p>
          )}
          {product && (
            <div className="quote-scope">
              <PriceBadge details={product.catalogDetails} />
              {scope && (
                <details open>
                  <summary>
                    {tr(
                      "راجع النطاق والمواصفات",
                      "Review scope & deliverables",
                    )}
                  </summary>
                  <p>{scope.shortDescription}</p>
                  <ul>
                    {scope.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {scope.exclusions.length > 0 && (
                    <>
                      <strong>{tr("غير مشمول", "Exclusions")}</strong>
                      <ul>
                        {scope.exclusions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <small>{scope.revisionsScope}</small>
                  <p>
                    {tr(
                      "مدة التسليم بأيام العمل:",
                      "Delivery in business days:",
                    )}{" "}
                    {product.catalogDetails?.deliveryDays}
                  </p>
                </details>
              )}
              <p>
                {new Intl.NumberFormat(language, {
                  style: "currency",
                  currency: product.currency,
                }).format(product.priceCents / 100)}
              </p>
              {priceKind(product.catalogDetails) === "monthly" && (
                <small>
                  {tr(
                    "نؤكد مدة الخدمة وشروط التجديد في العرض. لا يُفعّل تجديد تلقائي من هذا النموذج.",
                    "Service duration and renewal terms are confirmed in the quote. This form does not activate automatic renewal.",
                  )}
                </small>
              )}
            </div>
          )}
          <fieldset disabled={busy || !!submission.current}>
            <label>
              {tr("اسم العميل", "Customer name")}
              <input
                name="customerName"
                autoComplete="name"
                required
                maxLength={120}
              />
            </label>
            <label>
              {tr("البريد الإلكتروني", "Email")}
              <input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <label>
              {tr(
                "الهاتف / واتساب مع رمز الدولة",
                "Phone / WhatsApp with country code",
              )}
              <input
                name="phone"
                type="tel"
                dir="ltr"
                autoComplete="tel"
                required
                maxLength={24}
              />
              <small>
                {tr(
                  "اكتب علامة + ثم رمز الدولة ورقمك.",
                  "Enter + followed by your country code and number.",
                )}
              </small>
            </label>
            <label>
              {tr("نطاق المشروع وملاحظاتك", "Project scope & notes")}
              <textarea name="notes" required maxLength={4000} rows={4} />
            </label>
            <label>
              {tr("لغة التواصل المفضلة", "Preferred contact language")}
              <select
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="quote-honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="commerce-check">
              <input type="checkbox" required />
              {tr(
                "أوافق على التواصل بخصوص طلبي وفق سياسة الخصوصية.",
                "I agree to be contacted about this request under the privacy policy.",
              )}
            </label>
          </fieldset>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            {tr("سياسة الخصوصية", "Privacy policy")}
          </a>
          {error && <p role="alert">{error}</p>}
          {submission.current && !busy && (
            <p>
              {tr(
                "تحقق من نتيجة الإرسال بالزر أدناه؛ تبقى نفس البيانات والمعرّف لمنع التكرار.",
                "Use the button below to recover the submission result. The same details and reference key are retained to prevent duplicates.",
              )}
            </p>
          )}
          <button
            className="button primary"
            disabled={busy || loading || catalogError}
          >
            <FileCheck2 size={17} />
            {busy
              ? tr("جارٍ حفظ الطلب…", "Saving request…")
              : submission.current
                ? tr("استعادة نتيجة الطلب", "Recover request result")
                : tr("أرسل طلب عرض السعر", "Send quote request")}
          </button>
          {submission.current && !busy && (
            <button type="button" className="button subtle" onClick={onClose}>
              {tr("إغلاق النافذة", "Close window")}
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
