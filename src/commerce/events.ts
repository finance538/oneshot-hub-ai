export type QuoteIntent = {
  productId?: string;
  sku?: string;
  toolSlug?: string;
  kind?: "service" | "pro";
};
export function requestQuote(intent: QuoteIntent = {}) {
  window.dispatchEvent(new CustomEvent("oneshot:quote", { detail: intent }));
}
export function requestCheckout(sku: string) {
  window.dispatchEvent(
    new CustomEvent("oneshot:checkout", { detail: { sku } }),
  );
}
