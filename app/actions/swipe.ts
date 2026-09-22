"use server";

import { assertOnboardedUser } from "@/lib/auth";
import { isEligible, recordFriend, recordPass } from "@/lib/deck";
import type { ActionResult } from "@/lib/types";

export async function swipe(targetId: string, direction: "pass" | "friend"): Promise<ActionResult<{ matchId: string | null }>> {
  const viewer = await assertOnboardedUser();
  // Re-check server-side: the client deck may be stale (blocks, filter changes, double taps).
  if (!(await isEligible(viewer, targetId))) return { ok: true, matchId: null };
  if (direction === "pass") {
    await recordPass(viewer.id, targetId);
    return { ok: true, matchId: null };
  }
  return { ok: true, matchId: await recordFriend(viewer.id, targetId) };
}
