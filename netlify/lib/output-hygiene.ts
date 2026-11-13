/**
 * Keeps platform chatter out of customer-facing deliverables.
 *
 * A model asked for an email or an HTML page sometimes opens or closes it with
 * a status line about the platform itself ("✨ النظام يعمل بكفاءة عالية وجميع
 * الخدمات متصلة", "All systems operational"). Inside a reply that is harmless;
 * inside a message a customer receives it is a leak of internal state and it
 * reads as a defect. The instruction in models.ts tells the model not to write
 * them; this is the net underneath, applied where the text leaves the platform.
 *
 * It removes whole lines, never fragments, and only lines that are a status
 * announcement on their own — so an email that genuinely discusses system
 * status because the user asked it to keeps its sentences.
 */

// Each pattern matches a line that announces platform/connection state. They are
// deliberately narrow: a status word alone is not enough, the line has to read
// like a banner — short, standalone, and about the system rather than the reader.
const NOTICE = [
  /النظام\s+يعمل/,
  /جميع\s+(?:الخدمات|الأنظمة)\s+(?:متصلة|تعمل|جاهزة)/,
  /الخدمات\s+متصلة/,
  /كل\s+(?:الأنظمة|الخدمات)\s+(?:تعمل|متصلة)/,
  /\ball\s+(?:systems|services)\s+(?:are\s+)?(?:operational|connected|online|running)\b/i,
  /\bsystem(?:s)?\s+(?:is|are)\s+(?:running|operational|healthy)\b/i,
  /\b(?:services?|connection)\s+status\s*[:：]/i,
  /\bconnected\s+to\s+all\s+services\b/i,
  /يعمل\s+بكفاءة\s+عالية/,
];

const MAX_NOTICE_LENGTH = 160;

/** Is this single line a platform status banner rather than content? */
export function isSystemNotice(line: string): boolean {
  const text = line.replace(/<[^>]+>/g, ' ').replace(/[*_`#>|-]/g, ' ').trim();
  if (!text || text.length > MAX_NOTICE_LENGTH) return false;
  return NOTICE.some(pattern => pattern.test(text));
}

/**
 * Strips status banners from a deliverable (email body, HTML, document text).
 * Collapses the blank space they leave behind so the result reads as written.
 */
export function stripSystemNotices(value: string): string {
  if (!value) return value;
  const cleaned = value
    .split(/\r?\n/)
    .filter(line => !isSystemNotice(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Never hand back an empty deliverable: if the whole text was a banner, the
  // caller's own validation should see the original and refuse it.
  return cleaned || value.trim();
}
