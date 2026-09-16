import { db } from "./db";
import type { Profile, ProfilePhoto, ProfilePrompt, ProfileTag, UserRow } from "./types";

export function getProfile(userId: string): Profile | null {
  const conn = db();
  const user = conn.prepare("SELECT * FROM users WHERE id = ? AND name IS NOT NULL").get(userId) as UserRow | undefined;
  if (!user) return null;
  const photos = conn
    .prepare("SELECT id, url, position FROM photos WHERE user_id = ? ORDER BY position")
    .all(userId) as ProfilePhoto[];
  const interests = conn
    .prepare(
      `SELECT t.id, t.name, t.category, t.emoji FROM user_interests ui
       JOIN interest_tags t ON t.id = ui.tag_id WHERE ui.user_id = ? ORDER BY t.category, t.name`,
    )
    .all(userId) as ProfileTag[];
  const customTag =
    (conn.prepare("SELECT id, text FROM user_custom_tags WHERE user_id = ?").get(userId) as Profile["customTag"] | undefined) ?? null;
  const prompts = conn
    .prepare(
      `SELECT up.id, up.prompt_id AS promptId, p.text AS question, up.answer_text AS answerText,
              up.image_url AS imageUrl, up.position
       FROM user_prompts up JOIN prompts p ON p.id = up.prompt_id
       WHERE up.user_id = ? ORDER BY up.position`,
    )
    .all(userId) as ProfilePrompt[];
  return {
    id: user.id,
    name: user.name!,
    age: user.age!,
    major: user.major!,
    residenceStatus: user.residence_status,
    photos,
    interests,
    customTag,
    prompts,
  };
}

export function firstPhotoUrl(userId: string): string | null {
  const row = db().prepare("SELECT url FROM photos WHERE user_id = ? ORDER BY position LIMIT 1").get(userId) as
    | { url: string }
    | undefined;
  return row?.url ?? null;
}

export function getTagTaxonomy(): ProfileTag[] {
  return db().prepare("SELECT id, name, category, emoji FROM interest_tags ORDER BY id").all() as ProfileTag[];
}

export function getPromptBank(): { id: number; text: string }[] {
  return db().prepare("SELECT id, text FROM prompts ORDER BY id").all() as { id: number; text: string }[];
}
