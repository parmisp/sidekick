"use server";

import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, setSession } from "@/lib/auth";
import { consumeVerification, requestVerification } from "@/lib/verification";
import { DEMO_EMAIL } from "@/lib/config";
import { clearDemoAccount, resetDemoAccount } from "@/lib/demo-account";
import { get, newId, run } from "@/lib/db";
import { hashPhone, normalizePhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

export async function sendCode(email: string): Promise<ActionResult> {
  try {
    return await requestVerification(email);
  } catch {
    return { ok: false, error: "We couldn't start sign-in. Please try again later." };
  }
}

export async function verifyCode(email: string, code: string): Promise<ActionResult<{ next: string }>> {
  try {
    const verification = await consumeVerification(email, code);
    if (!verification.ok) return verification;
  } catch {
    return { ok: false, error: "We couldn't verify your code. Please try again later." };
  }

  const normalized = email.trim().toLowerCase();
  let user: { id: string; phone: string | null; profile_complete: number };
  try {
    if (normalized === DEMO_EMAIL) {
      user = await resetDemoAccount();
    } else {
      // INSERT OR IGNORE so two simultaneous first logins can't create duplicate accounts.
      await run("INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)", [newId(), normalized, Date.now()]);
      user = (await get<{ id: string; phone: string | null; profile_complete: number }>(
        "SELECT id, phone, profile_complete FROM users WHERE lower(trim(email)) = ?",
        [normalized],
      ))!;
    }
  } catch (e) {
    // Most likely the deployment has no database configured yet — see /api/health.
    console.error("Sign-in failed", e);
    return { ok: false, error: "This deployment isn't finished being set up (no database). Check /api/health." };
  }
  await setSession(user.id);
  return { ok: true, next: !user.phone ? "/login/phone" : user.profile_complete ? "/discover" : "/setup" };
}

export async function savePhone(phone: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired — sign in again." };
  const normalized = typeof phone === "string" ? normalizePhone(phone) : null;
  if (!normalized) return { ok: false, error: "Enter a valid phone number, including area code." };
  // TODO: verify phone ownership via SMS before launch. The demo trusts whatever is typed.
  const phoneHash = hashPhone(normalized);
  const duplicate = await get("SELECT id FROM users WHERE phone_hash = ? AND id != ?", [phoneHash, user.id]);
  if (duplicate) return { ok: false, error: "This number is already linked to an account. Please sign in to that account or use a different number." };
  try {
    // The database also enforces this rule if two signups race for one number.
    const result = await run("UPDATE users SET phone = ?, phone_hash = ? WHERE id = ?", [normalized, phoneHash, user.id]);
    if (!result.changes) return { ok: false, error: "Your session expired — sign in again." };
  } catch (error) {
    if (error instanceof Error && error.message.includes("PHONE_ALREADY_LINKED")) {
      return { ok: false, error: "This number is already linked to an account. Please sign in to that account or use a different number." };
    }
    return { ok: false, error: "We couldn’t save your number. Please try again." };
  }
  return { ok: true };
}

export async function logout() {
  const user = await getCurrentUser();
  if (user?.email === DEMO_EMAIL) await clearDemoAccount(user.id);
  await clearSession();
  redirect("/login");
}

export async function restartDemo(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user?.email !== DEMO_EMAIL) return { ok: false, error: "This option is only available for the demo account." };
  try {
    const fresh = await resetDemoAccount();
    await setSession(fresh.id);
  } catch {
    return { ok: false, error: "Couldn't restart the demo. Please try again." };
  }
  redirect("/login/phone");
}
