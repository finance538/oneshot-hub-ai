import { useAppearance } from "../storefront/i18n";
import { priceKind } from "../../shared/commerce";
import type { OriginalProduct } from "../../shared/storefront";
export function PriceBadge({
  details,
}: {
  details?: Pick<OriginalProduct, "pricing"> | null;
}) {
  const { tr } = useAppearance();
  const kind = priceKind(details);
  return (
    <span className={`price-badge price-${kind}`}>
      {kind === "fixed"
        ? tr("سعر ثابت", "Fixed price")
        : kind === "monthly"
          ? tr("اشتراك شهري", "Monthly plan")
          : tr("يبدأ من", "Starting from")}
    </span>
  );
}
export function CustomerJourney() {
  const { tr } = useAppearance();
  return (
    <ol
      className="customer-journey"
      aria-label={tr("رحلتك في ثلاث خطوات", "Your journey in three steps")}
    >
      {[
        ["اختر الخدمة أو الباقة", "Select a service or package"],
        ["راجع النطاق والمواصفات", "Review scope & deliverables"],
        ["اطلب عرض سعر فوري أو ادفع بأمان", "Request a quote or pay securely"],
      ].map(([ar, en], index) => (
        <li key={en}>
          <span aria-hidden="true">0{index + 1}</span>
          <strong>{tr(ar, en)}</strong>
        </li>
      ))}
    </ol>
  );
}
