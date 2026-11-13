import type { Config } from "@netlify/functions";
import { markDueFollowUps } from "../lib/follow-ups.js";
import {
  ownersWithFollowUps,
  runOwnerFollowUps,
} from "../lib/follow-up-mail.js";

/**
 * تنبيه المتابعات: مرة كل ساعة يكفي لعمل مقياسه الأيام.
 * لا يُرسل شيئاً — يرفع الحالة إلى «حلّ موعدها» فقط ليراها المالك.
 */
export default async () => {
  try {
    const result = await markDueFollowUps();
    // ثم بريد المالكين الذين ربطوا Gmail: التقاط الردود، وإرسال ما أذنوا به.
    // مالك واحد يفشل لا يمنع الباقي، والعدد محدود حتى لا تتجاوز الدالة مهلتها.
    const owners = await ownersWithFollowUps(4);
    const deadline = Date.now() + 20_000;
    const mail = { owners: owners.length, replies: 0, sent: 0 };
    for (const owner of owners) {
      if (Date.now() > deadline) break;
      const cycle = await runOwnerFollowUps(owner, deadline).catch(
        () => null,
      );
      if (cycle && !("skipped" in cycle)) {
        mail.replies += cycle.replies;
        mail.sent += cycle.sent;
      }
    }
    Object.assign(result, { mail });
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("follow-ups-cron", (error as Error)?.message);
    return new Response(JSON.stringify({ marked: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { schedule: "7 * * * *" };
