import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// DEMO: secrets are generated on first run and persisted to data/.secrets.json so
// the demo works with zero configuration. In production these must come from a
// real secret manager (SESSION_SECRET / PHONE_HASH_PEPPER env vars at minimum).
type Secrets = { sessionSecret: string; phonePepper: string };

let cached: Secrets | null = null;

export function getSecrets(): Secrets {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", ".secrets.json");
  let stored: Partial<Secrets> = {};
  try {
    stored = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // first run
  }
  const next: Secrets = {
    sessionSecret: stored.sessionSecret ?? crypto.randomBytes(32).toString("hex"),
    phonePepper: stored.phonePepper ?? crypto.randomBytes(32).toString("hex"),
  };
  if (!stored.sessionSecret || !stored.phonePepper) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2), { mode: 0o600 });
  }
  cached = {
    sessionSecret: process.env.SESSION_SECRET ?? next.sessionSecret,
    phonePepper: process.env.PHONE_HASH_PEPPER ?? next.phonePepper,
  };
  return cached;
}
