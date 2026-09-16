"use server";

import { getCurrentUser } from "@/lib/auth";
import { CUSTOM_TAG_MAX, MAX_AGE, MAX_INTERESTS, MIN_AGE, MIN_INTERESTS, PHOTO_SLOTS, PROMPT_ANSWER_MAX, PROMPT_SLOTS } from "@/lib/config";
import { db, newId } from "@/lib/db";
import { simulateInterestInNewUser } from "@/lib/demo";
import { containsProfanity } from "@/lib/moderation";
import type { ActionResult, Gender, GenderFilterMode, ResidenceStatus } from "@/lib/types";

export type ProfileInput = {
  photos: (string | null)[];
  name: string;
  age: number;
  major: string;
  residenceStatus: ResidenceStatus | null;
  gender: Gender | null;
  genderFilterMode: GenderFilterMode;
  tagIds: number[];
  customTag: string;
  prompts: { promptId: number | null; answer: string; imageUrl: string | null }[];
};

// Only accept images this server issued (uploads) or demo placeholders — never arbitrary external URLs.
const isOurImage = (url: string) =>
  /^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(url) || url.startsWith("/api/placeholder/");

function validate(input: ProfileInput): string | null {
  if (input.photos.length !== PHOTO_SLOTS || input.photos.some((p) => !p || !isOurImage(p))) return "Add all 4 photos.";
  const name = input.name.trim();
  if (name.length < 1 || name.length > 40) return "Add your name (up to 40 characters).";
  if (!Number.isInteger(input.age) || input.age < MIN_AGE || input.age > MAX_AGE) return `You need to be ${MIN_AGE} or older to use Sidequest.`;
  if (input.major.trim().length < 2 || input.major.trim().length > 60) return "Add your major.";
  if (input.residenceStatus !== null && !["residence", "commuter"].includes(input.residenceStatus)) return "Invalid residence status.";
  if (!input.gender || !["male", "female", "rather_not_say"].includes(input.gender)) return "Choose a gender option.";
  if (!["everyone", "same_gender"].includes(input.genderFilterMode)) return "Invalid filter.";
  const tags = new Set(input.tagIds);
  if (tags.size < MIN_INTERESTS || tags.size > MAX_INTERESTS) return `Pick ${MIN_INTERESTS}–${MAX_INTERESTS} interests.`;
  if (input.customTag.trim().length > CUSTOM_TAG_MAX) return `Custom tag must be ${CUSTOM_TAG_MAX} characters or fewer.`;
  if (input.prompts.length !== PROMPT_SLOTS) return "Answer 3 prompts.";
  const promptIds = input.prompts.map((p) => p.promptId);
  if (promptIds.some((id) => !id) || new Set(promptIds).size !== PROMPT_SLOTS) return "Choose 3 different prompts.";
  for (const p of input.prompts) {
    // An image is optional, but the written answer is always required.
    if (!p.answer.trim()) return "Every prompt needs a written answer, even with an image.";
    if (p.answer.trim().length > PROMPT_ANSWER_MAX) return `Prompt answers are limited to ${PROMPT_ANSWER_MAX} characters.`;
    if (p.imageUrl && !isOurImage(p.imageUrl)) return "Invalid prompt image.";
  }
  const texts = [name, input.major, input.customTag, ...input.prompts.map((p) => p.answer)];
  if (texts.some(containsProfanity)) return "Some of your text didn't pass our content filter. Please rephrase.";
  return null;
}

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !user.phone) return { ok: false, error: "Your session expired — sign in again." };
  const error = validate(input);
  if (error) return { ok: false, error };

  const conn = db();
  const validTags = conn
    .prepare(`SELECT COUNT(*) AS n FROM interest_tags WHERE id IN (${input.tagIds.map(() => "?").join(",")})`)
    .get(...input.tagIds) as { n: number };
  if (validTags.n !== new Set(input.tagIds).size) return { ok: false, error: "Unknown interest tag." };

  conn.transaction(() => {
    conn
      .prepare(
        `UPDATE users SET name = ?, age = ?, major = ?, residence_status = ?, gender = ?, gender_filter_mode = ?, profile_complete = 1
         WHERE id = ?`,
      )
      .run(input.name.trim(), input.age, input.major.trim(), input.residenceStatus, input.gender, input.genderFilterMode, user.id);

    // Upsert by slot so ids stay stable and existing comments keep pointing at the right content.
    const upsertPhoto = conn.prepare(
      `INSERT INTO photos (id, user_id, url, position) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, position) DO UPDATE SET url = excluded.url`,
    );
    input.photos.forEach((url, pos) => upsertPhoto.run(newId(), user.id, url, pos));

    conn.prepare("DELETE FROM user_interests WHERE user_id = ?").run(user.id);
    const insertInterest = conn.prepare("INSERT INTO user_interests (user_id, tag_id) VALUES (?, ?)");
    [...new Set(input.tagIds)].forEach((t) => insertInterest.run(user.id, t));

    const custom = input.customTag.trim();
    if (custom) {
      conn
        .prepare(
          `INSERT INTO user_custom_tags (id, user_id, text) VALUES (?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE SET text = excluded.text`,
        )
        .run(newId(), user.id, custom);
    } else {
      conn.prepare("DELETE FROM user_custom_tags WHERE user_id = ?").run(user.id);
    }

    const upsertPrompt = conn.prepare(
      `INSERT INTO user_prompts (id, user_id, prompt_id, answer_text, image_url, position) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, position) DO UPDATE SET prompt_id = excluded.prompt_id, answer_text = excluded.answer_text, image_url = excluded.image_url`,
    );
    input.prompts.forEach((p, pos) => upsertPrompt.run(newId(), user.id, p.promptId, p.answer.trim(), p.imageUrl, pos));
  })();

  // DEMO: give a solo tester some incoming likes and comments.
  if (!user.demo_simulated && !user.is_seed) simulateInterestInNewUser({ ...user, gender: input.gender, gender_filter_mode: input.genderFilterMode });

  return { ok: true };
}
