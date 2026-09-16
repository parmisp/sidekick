import crypto from "node:crypto";
import { getSecrets } from "./secrets";

/**
 * Normalizes to digits only. 10-digit numbers are assumed to be North American
 * and get a leading "1". DEMO simplification: production should use a proper
 * E.164 library (e.g. libphonenumber) with the user's region.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const normalized = digits.length === 10 ? "1" + digits : digits;
  if (normalized.length < 8 || normalized.length > 15) return null;
  return normalized;
}

/** Keyed hash so a leaked table can't be reversed with a simple phone-number dictionary. */
export function hashPhone(normalized: string): string {
  return crypto.createHmac("sha256", getSecrets().phonePepper).update(normalized).digest("hex");
}
