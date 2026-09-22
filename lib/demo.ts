// DEMO ONLY: fakes activity from seed profiles so a single live tester can
// experience matches, inbox comments and chat replies. Delete this file (and
// its call sites, all marked "DEMO") before launch.
import type { InStatement } from "@libsql/client";
import { after } from "next/server";
import { all, db, get, newId, run } from "./db";
import type { UserRow } from "./types";
import { MUTUALLY_VISIBLE_SQL, viewerParams } from "./visibility";

const PHOTO_COMMENTS = ["Okay this photo is a whole vibe 📸", "Wait where is this?? I need to go", "The lighting in this is unreal"];
const PROMPT_COMMENTS = ["Hard agree with this honestly", "Ok we need to debate this over coffee", "This is the most relatable thing I've read all week"];
const TAG_COMMENTS = ["Finally someone else who gets it", "Wait same!! we should talk"];
const AUTO_REPLIES = [
  "Haha yes!! 😄",
  "Omg same",
  "When are you free this week?",
  "That's so fun, tell me more",
  "Wanna grab coffee near the library sometime?",
  "Honestly that's the best thing I've heard all day",
  "Ok you have good taste",
  "I'm down! Thursday after class?",
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Called once, when a real user first completes their profile. */
export async function simulateInterestInNewUser(user: UserRow) {
  const [visibleSeeds, photos, prompts, custom] = await Promise.all([
    all<{ id: string }>(`SELECT u.id FROM users u WHERE u.is_seed = 1 AND ${MUTUALLY_VISIBLE_SQL}`, viewerParams(user)),
    all<{ id: string }>("SELECT id FROM photos WHERE user_id = ? ORDER BY position", [user.id]),
    all<{ id: string }>("SELECT id FROM user_prompts WHERE user_id = ? ORDER BY position", [user.id]),
    get<{ id: string }>("SELECT id FROM user_custom_tags WHERE user_id = ?", [user.id]),
  ]);
  const seeds = visibleSeeds.map((r) => r.id).sort(() => Math.random() - 0.5);
  const now = Date.now();
  const statements: InStatement[] = [];

  // ~45% of visible seed profiles have already swiped "friend" on the tester.
  for (const id of seeds.slice(0, Math.round(seeds.length * 0.45))) {
    statements.push({
      sql: "INSERT INTO swipes (id, swiper_id, swipee_id, direction, created_at) VALUES (?, ?, ?, 'friend', ?)",
      args: [newId(), id, user.id, now],
    });
  }

  // Three comments from other seed profiles, so the Inbox isn't empty.
  const targets: [string, string | undefined, string][] = [
    ["photo", photos[0]?.id, pick(PHOTO_COMMENTS)],
    ["prompt", prompts.length ? pick(prompts).id : undefined, pick(PROMPT_COMMENTS)],
    custom ? ["custom_tag", custom.id, pick(TAG_COMMENTS)] : ["photo", photos[1]?.id, pick(PHOTO_COMMENTS)],
  ];
  const commenters = seeds.slice(-3);
  targets.forEach(([type, targetId, text], i) => {
    if (commenters[i] && targetId) {
      statements.push({
        sql: `INSERT INTO comments (id, author_id, target_user_id, target_type, target_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newId(), commenters[i], user.id, type, targetId, text, now - (i + 1) * 7 * 60_000],
      });
    }
  });
  statements.push({ sql: "UPDATE users SET demo_simulated = 1 WHERE id = ?", args: [user.id] });
  await (await db()).batch(statements, "write");
}

/**
 * Seed profiles "type back" a few seconds after a real user messages them.
 * Uses next/server `after`, which keeps a serverless function alive until the
 * callback finishes (a plain setTimeout would be frozen once the response is sent).
 */
export function scheduleSeedReply(matchId: string, seedUserId: string) {
  after(async () => {
    await new Promise((r) => setTimeout(r, 2500 + Math.random() * 2500));
    const last = await get<{ sender_id: string }>(
      "SELECT sender_id FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1",
      [matchId],
    );
    // Only reply if the real user spoke last (avoids a reply per rapid-fire message).
    if (!last || last.sender_id === seedUserId) return;
    await run("INSERT INTO messages (id, match_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)", [
      newId(),
      matchId,
      seedUserId,
      pick(AUTO_REPLIES),
      Date.now(),
    ]);
  });
}
