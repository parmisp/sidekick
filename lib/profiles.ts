import { all } from "./db";
import { residenceName } from "./residences";
import type { Profile, ProfilePhoto, ProfilePrompt, ProfileTag, UserRow } from "./types";

const placeholders = (n: number) => Array(n).fill("?").join(",");

/**
 * Loads several profiles with 5 queries total (not 5 per profile) — matters when the
 * database is remote. Returned in the same order as `ids`; unknown ids are skipped.
 */
export async function getProfiles(ids: string[], viewer: Pick<UserRow, "residence_status"> | null = null): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const inList = placeholders(ids.length);
  const [users, photos, interests, customTags, prompts] = await Promise.all([
    all<UserRow>(`SELECT * FROM users WHERE id IN (${inList}) AND name IS NOT NULL AND is_active = 1`, ids),
    all<ProfilePhoto & { userId: string }>(
      `SELECT id, user_id AS userId, url, position FROM photos WHERE user_id IN (${inList}) ORDER BY position`,
      ids,
    ),
    all<ProfileTag & { userId: string }>(
      `SELECT ui.user_id AS userId, t.id, t.name, t.category, t.emoji FROM user_interests ui
       JOIN interest_tags t ON t.id = ui.tag_id WHERE ui.user_id IN (${inList}) ORDER BY t.category, t.name`,
      ids,
    ),
    all<{ id: string; userId: string; text: string }>(`SELECT id, user_id AS userId, text FROM user_custom_tags WHERE user_id IN (${inList})`, ids),
    all<ProfilePrompt & { userId: string }>(
      `SELECT up.id, up.user_id AS userId, up.prompt_id AS promptId, p.text AS question, up.answer_text AS answerText,
              up.image_url AS imageUrl, up.position
       FROM user_prompts up JOIN prompts p ON p.id = up.prompt_id
       WHERE up.user_id IN (${inList}) ORDER BY up.position`,
      ids,
    ),
  ]);

  const byUser = <T extends { userId: string }>(rows: T[], userId: string): Omit<T, "userId">[] =>
    rows
      .filter((r) => r.userId === userId)
      .map((r) => {
        const rest: Partial<T> = { ...r };
        delete rest.userId;
        return rest as Omit<T, "userId">;
      });
  const usersById = new Map(users.map((u) => [u.id, u]));

  return ids.flatMap((id) => {
    const user = usersById.get(id);
    if (!user) return [];
    const custom = customTags.find((c) => c.userId === id);
    return [
      {
        id: user.id,
        name: user.name!,
        age: user.age!,
        major: user.major!,
        mainCampus: user.main_campus,
        degree: user.degree,
        hometown: user.hometown,
        residenceStatus: user.residence_status,
        // Filter before serialization, not just in the UI. No viewer means no disclosure.
        residenceName: viewer?.residence_status === "residence" && user.residence_status === "residence"
          ? residenceName(user.residence_id) : null,
        photos: byUser(photos, id),
        interests: byUser(interests, id),
        customTag: custom ? { id: custom.id, text: custom.text } : null,
        prompts: byUser(prompts, id),
      },
    ];
  });
}

export async function getProfile(userId: string, viewer: Pick<UserRow, "residence_status"> | null = null): Promise<Profile | null> {
  return (await getProfiles([userId], viewer))[0] ?? null;
}

export function getTagTaxonomy(): Promise<ProfileTag[]> {
  return all<ProfileTag>("SELECT id, name, category, emoji FROM interest_tags ORDER BY id");
}

export function getPromptBank(): Promise<{ id: number; text: string }[]> {
  return all<{ id: number; text: string }>("SELECT id, text FROM prompts ORDER BY id");
}

export async function getUserTagIds(userId: string): Promise<number[]> {
  return (await all<{ tag_id: number }>("SELECT tag_id FROM user_interests WHERE user_id = ?", [userId])).map((r) => r.tag_id);
}
