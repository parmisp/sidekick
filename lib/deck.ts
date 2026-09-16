import { DECK_AFFINITY_SHARE, DECK_SIZE, PASS_COOLDOWN_MS } from "./config";
import { db, newId } from "./db";
import { getProfile } from "./profiles";
import type { Profile, UserRow } from "./types";
import { MUTUALLY_VISIBLE_SQL, viewerParams } from "./visibility";

type CandidateRow = Pick<UserRow, "id" | "age" | "major" | "residence_status">;

/**
 * Everyone the viewer may be served right now:
 * - mutually visible (blocks + gender filters, see visibility.ts)
 * - not already friend-swiped by the viewer, not already matched
 * - not permanently excluded, and not inside a 30-day pass cooldown.
 *   A cooldown older than 30 days makes the person eligible again; passing a
 *   second time flips them to permanently_excluded (see recordPass).
 */
const ELIGIBLE_SQL = /* sql */ `
  ${MUTUALLY_VISIBLE_SQL}
  AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = :viewerId AND s.swipee_id = u.id AND s.direction = 'friend')
  AND NOT EXISTS (SELECT 1 FROM matches m WHERE (m.user_a_id = :viewerId AND m.user_b_id = u.id) OR (m.user_b_id = :viewerId AND m.user_a_id = u.id))
  AND NOT EXISTS (
    SELECT 1 FROM pass_states p WHERE p.swiper_id = :viewerId AND p.swipee_id = u.id
      AND (p.state = 'permanently_excluded' OR (p.state = 'cooldown_pending' AND p.passed_at > :cooldownCutoff))
  )
`;

function eligibleParams(viewer: UserRow) {
  return { ...viewerParams(viewer), cooldownCutoff: Date.now() - PASS_COOLDOWN_MS };
}

export function isEligible(viewer: UserRow, targetId: string): boolean {
  return !!db()
    .prepare(`SELECT 1 FROM users u WHERE u.id = :targetId AND ${ELIGIBLE_SQL}`)
    .get({ ...eligibleParams(viewer), targetId });
}

export function affinityScore(
  viewer: CandidateRow,
  candidate: CandidateRow,
  viewerTags: Set<number>,
  candidateTags: number[],
): number {
  let score = 0;
  const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
  if (norm(viewer.major) && norm(viewer.major) === norm(candidate.major)) score += 3;
  if (viewer.age != null && candidate.age != null && Math.abs(viewer.age - candidate.age) <= 2) score += 2;
  score += Math.min(4, candidateTags.filter((t) => viewerTags.has(t)).length);
  if (viewer.residence_status && viewer.residence_status === candidate.residence_status) score += 1;
  return score;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type DeckCard = { profile: Profile; sharedTagIds: number[]; reappearance: boolean };

/**
 * ~75% affinity-ranked + ~25% random discovery, interleaved so every 4th card is
 * a discovery pick. Discovery picks come from outside the affinity slice so they
 * actually widen the pool.
 */
export function buildDeck(viewer: UserRow): DeckCard[] {
  const conn = db();
  const candidates = conn
    .prepare(`SELECT u.id, u.age, u.major, u.residence_status FROM users u WHERE ${ELIGIBLE_SQL}`)
    .all(eligibleParams(viewer)) as CandidateRow[];
  if (candidates.length === 0) return [];

  const tagRows = conn.prepare("SELECT user_id, tag_id FROM user_interests").all() as { user_id: string; tag_id: number }[];
  const tagsByUser = new Map<string, number[]>();
  for (const r of tagRows) tagsByUser.set(r.user_id, [...(tagsByUser.get(r.user_id) ?? []), r.tag_id]);
  const viewerTags = new Set(tagsByUser.get(viewer.id) ?? []);

  // Shuffle before the stable sort so ties are broken randomly.
  const ranked = shuffle(candidates)
    .map((c) => ({ c, score: affinityScore(viewer, c, viewerTags, tagsByUser.get(c.id) ?? []) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);

  const size = Math.min(DECK_SIZE, ranked.length);
  const affinityCount = Math.ceil(size * DECK_AFFINITY_SHARE);
  const affinity = ranked.slice(0, affinityCount);
  const discovery = shuffle(ranked.slice(affinityCount)).slice(0, size - affinityCount);

  const deck: CandidateRow[] = [];
  while (deck.length < size && (affinity.length || discovery.length)) {
    const discoveryTurn = deck.length % 4 === 3;
    const next = (discoveryTurn ? discovery.shift() : affinity.shift()) ?? affinity.shift() ?? discovery.shift();
    if (next) deck.push(next);
  }

  const reappearing = new Set(
    (
      conn
        .prepare("SELECT swipee_id FROM pass_states WHERE swiper_id = ? AND state = 'cooldown_pending'")
        .all(viewer.id) as { swipee_id: string }[]
    ).map((r) => r.swipee_id),
  );

  return deck.flatMap((c) => {
    const profile = getProfile(c.id);
    if (!profile) return [];
    return [{ profile, sharedTagIds: (tagsByUser.get(c.id) ?? []).filter((t) => viewerTags.has(t)), reappearance: reappearing.has(c.id) }];
  });
}

export function recordPass(viewerId: string, targetId: string) {
  const conn = db();
  const now = Date.now();
  conn.transaction(() => {
    const existing = conn
      .prepare("SELECT state, passed_at FROM pass_states WHERE swiper_id = ? AND swipee_id = ?")
      .get(viewerId, targetId) as { state: string; passed_at: number } | undefined;
    if (!existing) {
      conn
        .prepare("INSERT INTO pass_states (swiper_id, swipee_id, state, passed_at) VALUES (?, ?, 'cooldown_pending', ?)")
        .run(viewerId, targetId, now);
    } else if (existing.state === "cooldown_pending" && existing.passed_at <= now - PASS_COOLDOWN_MS) {
      // This was the one re-appearance after cooldown — second pass is final.
      conn
        .prepare("UPDATE pass_states SET state = 'permanently_excluded', passed_at = ? WHERE swiper_id = ? AND swipee_id = ?")
        .run(now, viewerId, targetId);
    } else {
      return; // still in cooldown or already excluded: nothing to record (e.g. double tap)
    }
    conn
      .prepare("INSERT INTO swipes (id, swiper_id, swipee_id, direction, created_at) VALUES (?, ?, ?, 'pass', ?)")
      .run(newId(), viewerId, targetId, now);
  })();
}

/** Returns the match id if this friend swipe completed a mutual pair. */
export function recordFriend(viewerId: string, targetId: string): string | null {
  const conn = db();
  return conn.transaction(() => {
    conn
      .prepare("INSERT INTO swipes (id, swiper_id, swipee_id, direction, created_at) VALUES (?, ?, ?, 'friend', ?)")
      .run(newId(), viewerId, targetId, Date.now());
    // A friend swipe on a re-appearance resolves the earlier pass.
    conn.prepare("DELETE FROM pass_states WHERE swiper_id = ? AND swipee_id = ?").run(viewerId, targetId);
    const mutual = conn
      .prepare("SELECT 1 FROM swipes WHERE swiper_id = ? AND swipee_id = ? AND direction = 'friend'")
      .get(targetId, viewerId);
    return mutual ? ensureMatch(viewerId, targetId, "swipe") : null;
  })();
}

export function ensureMatch(a: string, b: string, source: "swipe" | "comment", sourceCommentId: string | null = null): string {
  const conn = db();
  const [userA, userB] = a < b ? [a, b] : [b, a];
  const existing = conn.prepare("SELECT id FROM matches WHERE user_a_id = ? AND user_b_id = ?").get(userA, userB) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;
  const id = newId();
  conn
    .prepare("INSERT INTO matches (id, user_a_id, user_b_id, source, source_comment_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, userA, userB, source, sourceCommentId, Date.now());
  return id;
}
