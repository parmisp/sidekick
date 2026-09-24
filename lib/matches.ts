import { all, get } from "./db";
import type { UserRow } from "./types";
import { NOT_BLOCKED_SQL, notBlockedParams } from "./visibility";

export type MatchSummary = {
  id: string;
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  createdAt: number;
  lastMessage: string | null;
  lastMessageAt: number | null;
  lastSenderIsMe: boolean;
};

export type ChatMessage = { id: string; senderId: string; text: string; createdAt: number };

/** Matches involving the viewer, excluding pairs that have since been phone-blocked. */
export async function listMatches(viewer: UserRow): Promise<MatchSummary[]> {
  const rows = await all<{
    id: string;
    created_at: number;
    other_id: string;
    other_name: string;
    other_photo: string | null;
    last_text: string | null;
    last_at: number | null;
    last_sender: string | null;
  }>(
      `SELECT m.id, m.created_at, o.id AS other_id, o.name AS other_name,
         (SELECT url FROM photos WHERE user_id = o.id ORDER BY position LIMIT 1) AS other_photo,
         lm.text AS last_text, lm.created_at AS last_at, lm.sender_id AS last_sender
       FROM matches m
       JOIN users o ON o.id = CASE WHEN m.user_a_id = :viewerId THEN m.user_b_id ELSE m.user_a_id END
       LEFT JOIN messages lm ON lm.id = (SELECT id FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1)
       WHERE (m.user_a_id = :viewerId OR m.user_b_id = :viewerId) AND ${NOT_BLOCKED_SQL("o")}
       ORDER BY COALESCE(lm.created_at, m.created_at) DESC`,
    notBlockedParams(viewer),
  );
  return rows.map((r) => ({
    id: r.id,
    otherId: r.other_id,
    otherName: r.other_name,
    otherPhoto: r.other_photo,
    createdAt: r.created_at,
    lastMessage: r.last_text,
    lastMessageAt: r.last_at,
    lastSenderIsMe: r.last_sender === viewer.id,
  }));
}

export type MatchDetail = {
  id: string;
  otherId: string;
  otherIsSeed: boolean;
  source: "swipe" | "comment";
  createdAt: number;
  sourceComment: { text: string; authorIsMe: boolean } | null;
};

/** Null if the match doesn't exist, the viewer isn't in it, or the pair is now blocked. */
export async function getMatchForViewer(viewer: UserRow, matchId: string): Promise<MatchDetail | null> {
  const row = await get<{ id: string; source: "swipe" | "comment"; created_at: number; other_id: string; is_seed: number; comment_text: string | null; comment_author: string | null }>(
      `SELECT m.id, m.source, m.created_at, o.id AS other_id, o.is_seed, c.text AS comment_text, c.author_id AS comment_author
       FROM matches m
       JOIN users o ON o.id = CASE WHEN m.user_a_id = :viewerId THEN m.user_b_id ELSE m.user_a_id END
       LEFT JOIN comments c ON c.id = m.source_comment_id
       WHERE m.id = :matchId AND (m.user_a_id = :viewerId OR m.user_b_id = :viewerId) AND ${NOT_BLOCKED_SQL("o")}`,
    { ...notBlockedParams(viewer), matchId },
  );
  if (!row) return null;
  return {
    id: row.id,
    otherId: row.other_id,
    otherIsSeed: !!row.is_seed,
    source: row.source,
    createdAt: row.created_at,
    sourceComment: row.comment_text ? { text: row.comment_text, authorIsMe: row.comment_author === viewer.id } : null,
  };
}

export function getMessages(matchId: string, after = 0): Promise<ChatMessage[]> {
  return all<ChatMessage>(
    `SELECT id, sender_id AS senderId, text, created_at AS createdAt FROM messages
     WHERE match_id = ? AND created_at > ? ORDER BY created_at ASC`,
    [matchId, after],
  );
}
