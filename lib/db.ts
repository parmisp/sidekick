import { createClient, type Client, type InArgs, type Transaction } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";
import { seedAcademics, seedStatements } from "./seed";

// Local dev: a SQLite file in ./data (no setup). Deployed (e.g. Vercel, whose disk is
// read-only): a hosted Turso database via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const IS_HOSTED_DB = !!process.env.TURSO_DATABASE_URL;

/** Anything that can run a statement: the client itself or an open transaction. */
export type Executor = Pick<Client | Transaction, "execute">;

const globalForDb = globalThis as unknown as { __sidekickDb?: Promise<Client> };

async function init(): Promise<Client> {
  if (!IS_HOSTED_DB && process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL is not set. Vercel's filesystem is read-only, so a hosted database is required (see README).");
  }
  if (!IS_HOSTED_DB) fs.mkdirSync(DATA_DIR, { recursive: true });
  const client = createClient(
    IS_HOSTED_DB
      ? { url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN }
      : { url: `file:${path.join(/*turbopackIgnore: true*/ DATA_DIR, "sidekick.db")}` },
  );
  if (!IS_HOSTED_DB) await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(SCHEMA);

  // Add optional profile fields to older databases without replacing any data.
  const columns = (await client.execute("PRAGMA table_info(users)")).rows.map((column) => column.name);
  for (const name of ["hometown", "residence_id", "main_campus", "degree"] as const) {
    if (!columns.includes(name)) {
      try {
        await client.execute(`ALTER TABLE users ADD COLUMN ${name} TEXT`);
      } catch (error) {
        // Another server may have applied the same additive migration first.
        const current = await client.execute("PRAGMA table_info(users)");
        if (!current.rows.some((column) => column.name === name)) throw error;
      }
    }
  }

  if (!columns.includes("is_active")) {
    try {
      await client.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
    } catch (error) {
      const current = await client.execute("PRAGMA table_info(users)");
      if (!current.rows.some((column) => column.name === "is_active")) throw error;
    }
  }

  const seeded = await client.execute("SELECT 1 FROM app_meta WHERE key = 'seeded'");
  if (seeded.rows.length === 0) {
    try {
      // The app_meta insert runs first in the same atomic batch, so if two server
      // instances seed at once, one fails on the primary key and nothing is duplicated.
      await client.batch([{ sql: "INSERT INTO app_meta (key, value) VALUES ('seeded', ?)", args: [Date.now()] }, ...seedStatements()], "write");
    } catch (e) {
      const again = await client.execute("SELECT 1 FROM app_meta WHERE key = 'seeded'");
      if (again.rows.length === 0) throw e;
    }
  }
  // Bring existing fictional profiles up to date without guessing real users' answers.
  const legacySeeds = await client.execute("SELECT id, major FROM users WHERE is_seed = 1 AND (main_campus IS NULL OR degree IS NULL)");
  if (legacySeeds.rows.length) {
    await client.batch(legacySeeds.rows.map((row) => {
      const academic = seedAcademics(String(row.major ?? ""));
      return { sql: "UPDATE users SET main_campus = COALESCE(main_campus, ?), degree = COALESCE(degree, ?) WHERE id = ? AND is_seed = 1", args: [academic.campus, academic.degree, row.id] };
    }), "write");
  }
  return client;
}

/** Lazily connects, creates tables and seeds demo data, once per server instance. */
export function db(): Promise<Client> {
  globalForDb.__sidekickDb ??= init().catch((e) => {
    globalForDb.__sidekickDb = undefined; // retry on the next request
    throw e;
  });
  return globalForDb.__sidekickDb;
}

const plain = <T>(rows: Record<string, unknown>[]): T[] => rows.map((r) => ({ ...r }) as T);

async function exec(sql: string, args: InArgs = [], ex?: Executor) {
  return (ex ?? (await db())).execute({ sql, args });
}

export async function all<T>(sql: string, args?: InArgs, ex?: Executor): Promise<T[]> {
  return plain<T>((await exec(sql, args, ex)).rows as unknown as Record<string, unknown>[]);
}

export async function get<T>(sql: string, args?: InArgs, ex?: Executor): Promise<T | null> {
  return (await all<T>(sql, args, ex))[0] ?? null;
}

export async function run(sql: string, args?: InArgs, ex?: Executor): Promise<{ changes: number }> {
  return { changes: (await exec(sql, args, ex)).rowsAffected };
}

/** Interactive write transaction; rolls back if `fn` throws. */
export async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  const t = await (await db()).transaction("write");
  try {
    const result = await fn(t);
    await t.commit();
    return result;
  } catch (e) {
    await t.rollback().catch(() => {});
    throw e;
  } finally {
    t.close();
  }
}

export const newId = () => crypto.randomUUID();
