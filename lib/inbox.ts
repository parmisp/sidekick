import { db } from "./db";
import type { CommentTargetType, UserRow } from "./types";
import { NOT_BLOCKED_SQL, viewerParams } from "./visibility";

export type InboxItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: number;
  isRead: boolean;
  targetType: CommentTargetType;
  targetLabel: string; // e.g. prompt question or tag text
  targetPreview: string | null; // photo url / prompt answer / tag text
  targetImage: string | null;
};

// Pending = not dismissed, not yet replied to, and author isn't in a blocked pair with the viewer.
const PENDING_SQL = /* sql */ `
  c.target_user_id = :viewerId AND c.dismissed_at IS NULL AND c.replied_at IS NULL
  AND ${NOT_BLOCKED_SQL("a")}
`;

export function countUnreadInbox(viewer: UserRow): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM comments c JOIN users a ON a.id = c.author_id WHERE ${PENDING_SQL} AND c.is_read = 0`)
    .get(viewerParams(viewer)) as { n: number };
  return row.n;
}

type Row = {
  id: string;
  author_id: string;
  author_name: string;
  author_photo: string | null;
  text: string;
  created_at: number;
  is_read: number;
  target_type: CommentTargetType;
  photo_url: string | null;
  prompt_question: string | null;
  prompt_answer: string | null;
  prompt_image: string | null;
  tag_text: string | null;
};

const SELECT = /* sql */ `
  SELECT c.id, c.author_id, a.name AS author_name,
    (SELECT url FROM photos WHERE user_id = a.id ORDER BY position LIMIT 1) AS author_photo,
    c.text, c.created_at, c.is_read, c.target_type,
    ph.url AS photo_url, pr.text AS prompt_question, up.answer_text AS prompt_answer, up.image_url AS prompt_image,
    ct.text AS tag_text
  FROM comments c
  JOIN users a ON a.id = c.author_id
  LEFT JOIN photos ph ON c.target_type = 'photo' AND ph.id = c.target_id
  LEFT JOIN user_prompts up ON c.target_type = 'prompt' AND up.id = c.target_id
  LEFT JOIN prompts pr ON pr.id = up.prompt_id
  LEFT JOIN user_custom_tags ct ON c.target_type = 'custom_tag' AND ct.id = c.target_id
`;

function toItem(r: Row): InboxItem {
  const [targetLabel, targetPreview, targetImage] =
    r.target_type === "photo"
      ? ["your photo", null, r.photo_url]
      : r.target_type === "prompt"
        ? [r.prompt_question ?? "your prompt", r.prompt_answer, r.prompt_image]
        : ["your tag", r.tag_text, null];
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorPhoto: r.author_photo,
    text: r.text,
    createdAt: r.created_at,
    isRead: !!r.is_read,
    targetType: r.target_type,
    targetLabel,
    targetPreview,
    targetImage,
  };
}

export function listInbox(viewer: UserRow): InboxItem[] {
  return (db().prepare(`${SELECT} WHERE ${PENDING_SQL} ORDER BY c.created_at DESC`).all(viewerParams(viewer)) as Row[]).map(toItem);
}

export function getInboxItem(viewer: UserRow, commentId: string): InboxItem | null {
  const row = db()
    .prepare(`${SELECT} WHERE c.id = :commentId AND ${PENDING_SQL}`)
    .get({ ...viewerParams(viewer), commentId }) as Row | undefined;
  return row ? toItem(row) : null;
}
