import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// SESSION_SECRET signs login cookies; PHONE_HASH_PEPPER keys phone-number hashes.
// Both must be set (and never change) when deployed — every server instance has to
// agree on them. For zero-config local dev they're generated once into
// data/.secrets.json instead.
type Secrets = { sessionSecret: string; phonePepper: string };

let cached: Secrets | null = null;

export function getSecrets(): Secrets {
  if (cached) return cached;
  const { SESSION_SECRET, PHONE_HASH_PEPPER } = process.env;
  if (SESSION_SECRET && PHONE_HASH_PEPPER) {
    return (cached = { sessionSecret: SESSION_SECRET, phonePepper: PHONE_HASH_PEPPER });
  }
  if (process.env.VERCEL) {
    throw new Error("Set SESSION_SECRET and PHONE_HASH_PEPPER environment variables (see README).");
  }

  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", ".secrets.json");
  let stored: Partial<Secrets> = {};
  try {
    stored = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // first run
  }
  const next: Secrets = {
    sessionSecret: SESSION_SECRET ?? stored.sessionSecret ?? crypto.randomBytes(32).toString("hex"),
    phonePepper: PHONE_HASH_PEPPER ?? stored.phonePepper ?? crypto.randomBytes(32).toString("hex"),
  };
  if (next.sessionSecret !== stored.sessionSecret || next.phonePepper !== stored.phonePepper) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2), { mode: 0o600 });
  }
  return (cached = next);
}
