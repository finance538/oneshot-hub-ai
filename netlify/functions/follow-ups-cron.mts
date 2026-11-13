import type { Config } from "@netlify/functions";
import { markDueFollowUps } from "../lib/follow-ups.js";

/**
 * تنبيه المتابعات: مرة كل ساعة يكفي لعمل مقياسه الأيام.
 * لا يُرسل شيئاً — يرفع الحالة إلى «حلّ موعدها» فقط ليراها المالك.
 */
export default async () => {
  try {
    const result = await markDueFollowUps();
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
