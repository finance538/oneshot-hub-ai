// Compiles the Vercel function entries (server/*.ts, which import the .mts handlers) into plain
// ES modules under api/. Vercel does not compile imported .mts files, so we bundle our own source
// here; npm packages stay external and Vercel traces them from node_modules.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("api/cron", { recursive: true });
const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  logLevel: "info",
};
await build({ ...shared, entryPoints: ["server/entry-api.ts"], outfile: "api/[...route].mjs" });
await build({ ...shared, entryPoints: ["server/entry-cron.ts"], outfile: "api/cron/[job].mjs" });
