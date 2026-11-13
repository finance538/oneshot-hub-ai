// Published pages are written by a model or pasted by an owner and then served to
// strangers from this origin, so two things protect visitors and the platform:
//
// 1. The response's Content-Security-Policy, which allows no script at all. That is
//    the control that actually holds, and it is enforced in the function.
// 2. This sanitiser, which removes the markup that would try anyway. Defence in
//    depth: if the policy is ever weakened, a published page still cannot run code.
//
// It is deliberately a remover, not a parser: anything it does not recognise as
// dangerous is left exactly as the author wrote it, so a page keeps its design.

const DANGEROUS_ELEMENTS = ['script', 'iframe', 'object', 'embed', 'applet', 'base', 'noscript'];

/** Strips an element and its content wherever it appears, closed or not. */
function dropElement(html: string, tag: string): string {
  const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
  const unclosed = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  return html.replace(paired, '').replace(unclosed, '');
}

export function sanitizePageHtml(html: string): string {
  let safe = String(html || '');
  for (const tag of DANGEROUS_ELEMENTS) safe = dropElement(safe, tag);

  // Inline event handlers in any quoting style: onclick="…", onload='…', onerror=…
  safe = safe.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  // Script-bearing URLs in any attribute that navigates or loads.
  safe = safe.replace(/\s(href|src|action|formaction|xlink:href|srcdoc|data)\s*=\s*"(?:\s*(?:javascript|vbscript|data:text\/html)[^"]*)"/gi, '')
    .replace(/\s(href|src|action|formaction|xlink:href|srcdoc|data)\s*=\s*'(?:\s*(?:javascript|vbscript|data:text\/html)[^']*)'/gi, '');

  // A meta refresh is a redirect a visitor never asked for.
  safe = safe.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

  // CSS expressions and url(javascript:…) — legacy, but free to remove.
  safe = safe.replace(/expression\s*\(/gi, '(').replace(/url\(\s*["']?\s*javascript:[^)]*\)/gi, 'none');

  return safe;
}

/** Page kinds an owner can publish. */
export const PAGE_KINDS = ['bio', 'booking', 'landing'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

/**
 * A URL-safe slug. Arabic is kept as written (browsers and Google handle it), only
 * separators and anything that would break a path are normalised.
 */
export function pageSlug(value: string): string {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return slug;
}
