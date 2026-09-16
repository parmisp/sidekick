// DEMO ONLY: fakes activity from seed profiles so a single live tester can
// experience matches, inbox comments and chat replies. Delete this file (and
// its call sites, all marked "DEMO") before launch.
import { db, newId } from "./db";
import type { UserRow } from "./types";
import { canSee } from "./visibility";

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
export function simulateInterestInNewUser(user: UserRow) {
  const conn = db();
  const seeds = (conn.prepare("SELECT id FROM users WHERE is_seed = 1").all() as { id: string }[])
    .map((r) => r.id)
    .filter((id) => canSee(user, id))
    .sort(() => Math.random() - 0.5);
  const now = Date.now();

  conn.transaction(() => {
    // ~45% of visible seed profiles have already swiped "friend" on the tester.
    const insertSwipe = conn.prepare(
      "INSERT INTO swipes (id, swiper_id, swipee_id, direction, created_at) VALUES (?, ?, ?, 'friend', ?)",
    );
    seeds.slice(0, Math.round(seeds.length * 0.45)).forEach((id) => insertSwipe.run(newId(), id, user.id, now));

    // Three comments from other seed profiles, so the Inbox isn't empty.
    const photos = conn.prepare("SELECT id FROM photos WHERE user_id = ? ORDER BY position").all(user.id) as { id: string }[];
    const prompts = conn.prepare("SELECT id FROM user_prompts WHERE user_id = ? ORDER BY position").all(user.id) as { id: string }[];
    const custom = conn.prepare("SELECT id FROM user_custom_tags WHERE user_id = ?").get(user.id) as { id: string } | undefined;
    const targets: [string, string, string][] = [
      ["photo", photos[0]?.id, pick(PHOTO_COMMENTS)],
      ["prompt", pick(prompts)?.id, pick(PROMPT_COMMENTS)],
      custom ? ["custom_tag", custom.id, pick(TAG_COMMENTS)] : ["photo", photos[1]?.id, pick(PHOTO_COMMENTS)],
    ];
    const commenters = seeds.slice(-3);
    const insertComment = conn.prepare(
      `INSERT INTO comments (id, author_id, target_user_id, target_type, target_id, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    targets.forEach(([type, targetId, text], i) => {
      if (commenters[i] && targetId) insertComment.run(newId(), commenters[i], user.id, type, targetId, text, now - (i + 1) * 7 * 60_000);
    });
    conn.prepare("UPDATE users SET demo_simulated = 1 WHERE id = ?").run(user.id);
  })();
}

/** Seed profiles "type back" a few seconds after a real user messages them. */
export function scheduleSeedReply(matchId: string, seedUserId: string) {
  setTimeout(() => {
    const conn = db();
    const last = conn
      .prepare("SELECT sender_id, created_at FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(matchId) as { sender_id: string; created_at: number } | undefined;
    // Only reply if the real user spoke last (avoids a reply per rapid-fire message).
    if (!last || last.sender_id === seedUserId) return;
    conn
      .prepare("INSERT INTO messages (id, match_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(newId(), matchId, seedUserId, pick(AUTO_REPLIES), Date.now());
  }, 2500 + Math.random() * 2500);
}
