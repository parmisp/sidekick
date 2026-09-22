"use server";

import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, setSession } from "@/lib/auth";
import { DEMO_VERIFICATION_CODE, isAllowedEmail } from "@/lib/config";
import { get, newId, run } from "@/lib/db";
import { hashPhone, normalizePhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

export async function sendCode(email: string): Promise<ActionResult> {
  if (!isAllowedEmail(email)) {
    return { ok: false, error: "Use your university email address (e.g. you@school.edu)." };
  }
  // TODO: replace with real email verification provider before launch.
  // Generate a random single-use code, store a hash with a short expiry, send it
  // via an email provider, and rate-limit by email + IP.
  return { ok: true };
}

export async function verifyCode(email: string, code: string): Promise<ActionResult<{ next: string }>> {
  if (!isAllowedEmail(email)) return { ok: false, error: "That email isn't on the allowed list." };
  // TODO: replace with real email verification provider before launch.
  if (code.trim() !== DEMO_VERIFICATION_CODE) return { ok: false, error: "That code isn't right. (Demo mode: use 000000.)" };

  const normalized = email.trim().toLowerCase();
  // INSERT OR IGNORE so two simultaneous first logins can't create duplicate accounts.
  await run("INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)", [newId(), normalized, Date.now()]);
  const user = (await get<{ id: string; phone: string | null; profile_complete: number }>(
    "SELECT id, phone, profile_complete FROM users WHERE email = ?",
    [normalized],
  ))!;
  await setSession(user.id);
  return { ok: true, next: !user.phone ? "/login/phone" : user.profile_complete ? "/discover" : "/setup" };
}

export async function savePhone(phone: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired — sign in again." };
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: "Enter a valid phone number, including area code." };
  // TODO: verify phone ownership via SMS before launch. The demo trusts whatever is typed.
  await run("UPDATE users SET phone = ?, phone_hash = ? WHERE id = ?", [phone.trim(), hashPhone(normalized), user.id]);
  return { ok: true };
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
