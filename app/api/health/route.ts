import { db, IS_HOSTED_DB } from "@/lib/db";

/**
 * Deployment self-check: which services are configured, and can we reach the
 * database? Reports presence only — never values. Useful when the app is
 * deployed somewhere new; safe to delete once it's set up.
 */
export async function GET() {
  const configured = {
    database: IS_HOSTED_DB ? "hosted (TURSO_DATABASE_URL set)" : "local file (no TURSO_DATABASE_URL)",
    databaseAuthToken: !!process.env.TURSO_AUTH_TOKEN,
    imageStorage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel blob" : "local disk (no BLOB_READ_WRITE_TOKEN)",
    sessionSecret: !!process.env.SESSION_SECRET,
    phoneHashPepper: !!process.env.PHONE_HASH_PEPPER,
    onVercel: !!process.env.VERCEL,
  };

  let database: { ok: boolean; detail: string };
  try {
    const client = await db();
    const seeds = await client.execute("SELECT COUNT(*) AS n FROM users WHERE is_seed = 1");
    database = { ok: true, detail: `connected, ${seeds.rows[0].n} seed profiles` };
  } catch (e) {
    database = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  return Response.json({ ok: database.ok, configured, database }, { status: database.ok ? 200 : 503 });
}
