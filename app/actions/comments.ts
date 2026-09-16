"use server";

import { revalidatePath } from "next/cache";
import { assertOnboardedUser, getUserById } from "@/lib/auth";
import { COMMENT_MAX } from "@/lib/config";
import { db, newId } from "@/lib/db";
import { ensureMatch } from "@/lib/deck";
import { getInboxItem } from "@/lib/inbox";
import { containsProfanity } from "@/lib/moderation";
import type { ActionResult, CommentTargetType } from "@/lib/types";
import { canSee } from "@/lib/visibility";

const TARGET_TABLE: Record<CommentTargetType, string> = {
  photo: "photos",
  prompt: "user_prompts",
  custom_tag: "user_custom_tags",
};

export async function addComment(
  targetUserId: string,
  targetType: CommentTargetType,
  targetId: string,
  text: string,
): Promise<ActionResult> {
  const viewer = await assertOnboardedUser();
  const body = text.trim();
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > COMMENT_MAX) return { ok: false, error: `Comments are limited to ${COMMENT_MAX} characters.` };
  // DEMO: word-list filter only. Comments need real moderation + reporting before launch.
  if (containsProfanity(body)) return { ok: false, error: "Keep it friendly — that comment didn't pass our filter." };
  if (!TARGET_TABLE[targetType] || targetUserId === viewer.id || !canSee(viewer, targetUserId)) {
    return { ok: false, error: "You can't comment on this profile." };
  }
  const owns = db().prepare(`SELECT 1 FROM ${TARGET_TABLE[targetType]} WHERE id = ? AND user_id = ?`).get(targetId, targetUserId);
  if (!owns) return { ok: false, error: "That content no longer exists." };

  db()
    .prepare(
      "INSERT INTO comments (id, author_id, target_user_id, target_type, target_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(newId(), viewer.id, targetUserId, targetType, targetId, body, Date.now());
  return { ok: true };
}

/** Replying creates a match straight away — no swipe needed — and returns the chat to open. */
export async function replyToComment(commentId: string): Promise<ActionResult<{ matchId: string }>> {
  const viewer = await assertOnboardedUser();
  const item = getInboxItem(viewer, commentId);
  if (!item || !getUserById(item.authorId)) return { ok: false, error: "This comment is no longer available." };
  const conn = db();
  const matchId = conn.transaction(() => {
    const id = ensureMatch(viewer.id, item.authorId, "comment", commentId);
    conn.prepare("UPDATE comments SET replied_at = ?, is_read = 1 WHERE id = ?").run(Date.now(), commentId);
    return id;
  })();
  revalidatePath("/", "layout");
  return { ok: true, matchId };
}

/** Silent: the author is never notified and swipe/deck state is untouched. */
export async function dismissComment(commentId: string): Promise<ActionResult> {
  const viewer = await assertOnboardedUser();
  db().prepare("UPDATE comments SET dismissed_at = ?, is_read = 1 WHERE id = ? AND target_user_id = ?").run(Date.now(), commentId, viewer.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
