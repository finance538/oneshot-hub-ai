import { admin } from "@netlify/identity";

export type HealReport = {
  total: number;
  unconfirmed: number;
  healed: string[];
  failed: string[];
};

/**
 * يؤكّد الحسابات العالقة (لم تستلم بريد التأكيد لأن SMTP غير مضبوط على Identity).
 * Google يثبت ملكية البريد، والإيميل العادي لا — لذلك هذه العملية تُنفّذ بمفتاح سري
 * من المالك فقط، وليست مفتوحة للعامة.
 */
export async function healUnconfirmedAccounts(dryRun = false): Promise<HealReport> {
  const report: HealReport = { total: 0, unconfirmed: 0, healed: [], failed: [] };
  for (let page = 1; page <= 50; page++) {
    const users = await admin.listUsers({ page, perPage: 100 });
    report.total += users.length;
    for (const user of users) {
      if (user.confirmedAt) continue;
      report.unconfirmed++;
      if (dryRun) continue;
      try {
        await admin.updateUser(user.id, { confirm: true });
        report.healed.push(user.email ?? user.id);
      } catch (error) {
        report.failed.push(`${user.email ?? user.id}: ${error instanceof Error ? error.message : "error"}`);
      }
    }
    if (users.length < 100) break;
  }
  return report;
}
