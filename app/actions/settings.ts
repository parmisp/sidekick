"use server";

import { revalidatePath } from "next/cache";
import { assertOnboardedUser } from "@/lib/auth";
import { PASS_COOLDOWN_MS } from "@/lib/config";
import { db } from "@/lib/db";
import { hashPhone, normalizePhone } from "@/lib/phone";
import type { ActionResult, GenderFilterMode } from "@/lib/types";

export async function updateGenderFilter(mode: GenderFilterMode): Promise<ActionResult> {
  const user = await assertOnboardedUser();
  if (mode !== "everyone" && mode !== "same_gender") return { ok: false, error: "Invalid option." };
  if (mode === "same_gender" && user.gender === "rather_not_say") {
    return { ok: false, error: "Choose a gender on your profile to use this filter." };
  }
  db().prepare("UPDATE users SET gender_filter_mode = ? WHERE id = ?").run(mode, user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

const BLOCK_CONFIRMATION = "If that number is on Sidequest, they won't be able to see or match with you.";

/**
 * Stores only a keyed hash of the number. The response is identical whether or
 * not the number belongs to an account, so this can't be used to probe who is on
 * Sidequest. Filtering happens silently in deck, inbox, matches and chat queries.
 */
export async function blockPhone(phone: string): Promise<ActionResult<{ message: string }>> {
  const user = await assertOnboardedUser();
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: "Enter a full phone number, including area code." };
  db()
    .prepare("INSERT OR IGNORE INTO phone_blocks (blocker_id, blocked_phone_hash, created_at) VALUES (?, ?, ?)")
    .run(user.id, hashPhone(normalized), Date.now());
  revalidatePath("/", "layout");
  return { ok: true, message: BLOCK_CONFIRMATION };
}

// ---- DEMO-only tools so testers can exercise time-based rules without waiting. Remove before launch. ----

export async function demoFastForwardCooldowns(): Promise<ActionResult<{ count: number }>> {
  const user = await assertOnboardedUser();
  const { changes } = db()
    .prepare("UPDATE pass_states SET passed_at = passed_at - ? WHERE swiper_id = ? AND state = 'cooldown_pending'")
    .run(PASS_COOLDOWN_MS, user.id);
  revalidatePath("/", "layout");
  return { ok: true, count: changes };
}

export async function demoResetSwipes(): Promise<ActionResult> {
  const user = await assertOnboardedUser();
  const conn = db();
  conn.transaction(() => {
    conn.prepare("DELETE FROM swipes WHERE swiper_id = ?").run(user.id);
    conn.prepare("DELETE FROM pass_states WHERE swiper_id = ?").run(user.id);
  })();
  revalidatePath("/", "layout");
  return { ok: true };
}
