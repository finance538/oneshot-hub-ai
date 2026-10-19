import type { Config } from "@netlify/functions";
import { notifyWorkspaceUpdates } from "../lib/experience.js";

export default async () => {
  if (Netlify.env.get("CONTEXT") !== "production") return;
  await notifyWorkspaceUpdates();
};
export const config: Config = { schedule: "*/5 * * * *" };
