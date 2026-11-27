import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

// Netlify keeps its managed database. On Vercel (VERCEL=1) the app uses a standard
// Postgres connection string (Neon sets POSTGRES_URL).
let pool: Pool | undefined;

// Both drivers expose the same query API; the Vercel branch is cast to the Netlify type so
// every caller keeps one signature.
type Db = ReturnType<typeof drizzleNetlify<typeof schema>>;

export function database(): Db {
  if (process.env.VERCEL === "1") {
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    if (!connectionString) throw new Error("database_not_configured: POSTGRES_URL is not set");
    pool ??= new Pool({ connectionString, max: 5 });
    return drizzlePg({ client: pool, schema }) as unknown as Db; // no caller uses batch()
  }
  return drizzleNetlify({ schema }) as Db;
}
