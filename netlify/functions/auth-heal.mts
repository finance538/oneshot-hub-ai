/**
 * POST /api/auth/heal — تأكيد الحسابات العالقة (إصلاح إداري)
 * ----------------------------------------------------------
 * سبب الحاجة: تسجيل البريد على Netlify Identity يحتاج رسالة تأكيد، وSMTP غير مضبوط
 * على المشروع، فتبقى الحسابات "غير مؤكدة" ولا تستطيع الدخول (ولا حتى بـGoogle).
 * هذا المسار يؤكّدها دفعة واحدة. محمي بمفتاح سري لا يُرسل للمتصفح.
 */
import { admin } from '@netlify/identity';

export default async (req: Request) => {
  if (req.method === 'GET') return json({ ok: true, ready: true, marker: 'heal-v1' });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const expected = process.env.AUTH_HEAL_KEY || '';
    const supplied = req.headers.get('x-heal-key') || '';
    if (!expected || expected.length < 16 || supplied !== expected)
      return json({ ok: false, error: 'غير مصرح.' }, 401);

    const dryRun = new URL(req.url).searchParams.get('dry') === '1';
    const report: any = { total: 0, unconfirmed: 0, healed: [] as string[], failed: [] as string[] };

    for (let page = 1; page <= 50; page++) {
      const users = await admin.listUsers({ page, perPage: 100 });
      report.total += users.length;
      for (const user of users) {
        if (user.confirmedAt) continue;
        report.unconfirmed++;
        if (dryRun) continue;
        try {
          await admin.updateUser(user.id, { confirm: true });
          report.healed.push(user.email || user.id);
        } catch (err) {
          report.failed.push(`${user.email || user.id}: ${err instanceof Error ? err.message : 'error'}`);
        }
      }
      if (users.length < 100) break;
    }

    return json({ ok: true, dryRun, ...report });
  } catch (err: any) {
    return json(
      { ok: false, stage: 'heal', name: err?.name, detail: err?.message || String(err), status: err?.status },
      500
    );
  }
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const config = { path: '/api/auth/heal', timeout: 26 };
