// Model output is untrusted data. Only bounded text lists reach the campaign UI.
export function normalizeAdDraft(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter(
            (item): item is string => typeof item === "string" && !!item.trim(),
          )
          .slice(0, 30)
          .map((item) => item.trim().slice(0, 500))
      : [];
  const headlines = list(row.headlines),
    keywords = list(row.keywords);
  if (!headlines.length || !keywords.length) return null;
  const audience =
    row.audience &&
    typeof row.audience === "object" &&
    !Array.isArray(row.audience)
      ? (row.audience as Record<string, unknown>)
      : {};
  return {
    headlines,
    keywords,
    descriptions: list(row.descriptions),
    negativeKeywords: list(row.negativeKeywords),
    callToActions: list(row.callToActions),
    audience: {
      description:
        typeof audience.description === "string"
          ? audience.description.slice(0, 1000)
          : "",
      targeting: list(audience.targeting),
    },
  };
}
