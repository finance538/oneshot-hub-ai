// Follow-ups: the quiet part of winning work.
//
// A quote goes out and then nothing happens — not because the client said no, but
// because nobody asked again. This tracks what was sent, notices when a reply has
// not come, and offers a draft. It never sends: the owner reads it and decides.

export const FOLLOW_UP_STATUSES = ['waiting', 'due', 'replied', 'closed'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const MIN_REMINDER_DAYS = 1;
export const MAX_REMINDER_DAYS = 30;
export const DEFAULT_REMINDER_DAYS = 3;

export function reminderDays(value: unknown): number {
  const days = Number(value);
  if (!Number.isFinite(days)) return DEFAULT_REMINDER_DAYS;
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, Math.round(days)));
}

/** Is this email one the owner would expect to hear back about? */
export function looksLikeOffer(subject: string, body = ''): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return /عرض سعر|عرض السعر|فاتورة|تسعير|اقتراح|quote|quotation|invoice|proposal|estimate|pricing/.test(text);
}

/** Has enough time passed, by the owner's own choice of days? */
export function isDue(sentAt: Date | string, days: number, now: Date = new Date()): boolean {
  const sent = sentAt instanceof Date ? sentAt : new Date(sentAt);
  if (!Number.isFinite(sent.getTime())) return false;
  return now.getTime() - sent.getTime() >= reminderDays(days) * 86400000;
}

/**
 * A first-draft follow-up, written without a model so there is always something to
 * send even when inference is unavailable. The engine replaces it with a tailored
 * one when it can; this is the floor, not the ceiling.
 */
export function defaultDraft(subject: string, lang: 'ar' | 'en' = 'ar'): string {
  const topic = subject.trim() || (lang === 'ar' ? 'العرض المرسل' : 'the offer we sent');
  return lang === 'ar'
    ? `السلام عليكم،\n\nأتابع معك بخصوص «${topic}». إن كان هناك أي استفسار أو تعديل تودّه، أنا جاهز.\n\nشاكر لك وقتك.`
    : `Hello,\n\nFollowing up on "${topic}". If anything needs adjusting or clarifying, I'm happy to help.\n\nThank you for your time.`;
}
