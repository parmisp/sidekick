import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";
import { seedDatabase } from "./seed";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const globalForDb = globalThis as unknown as { __sidequestDb?: Database.Database };

/** Lazily opens data/sidequest.db, creates tables and seeds demo data on first run. */
export function db(): Database.Database {
  if (!globalForDb.__sidequestDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const conn = new Database(path.join(DATA_DIR, "sidequest.db"));
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.exec(SCHEMA);
    const { n } = conn.prepare("SELECT COUNT(*) AS n FROM interest_tags").get() as { n: number };
    if (n === 0) seedDatabase(conn);
    globalForDb.__sidequestDb = conn;
  }
  return globalForDb.__sidequestDb;
}

export const newId = () => crypto.randomUUID();
