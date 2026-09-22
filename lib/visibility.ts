import { get } from "./db";
import type { UserRow } from "./types";

/**
 * SQL fragment (for a candidate aliased as `u`) that is true when the viewer and
 * candidate may see each other at all: no phone block in either direction, and
 * both people's gender filters allow it.
 *
 * The gender filter is applied mutually: someone who chose "same gender" is also
 * never shown to people outside that setting. Bind with viewerParams().
 */
export const MUTUALLY_VISIBLE_SQL = /* sql */ `
  u.profile_complete = 1
  AND u.id != :viewerId
  AND NOT EXISTS (SELECT 1 FROM phone_blocks b WHERE b.blocker_id = :viewerId AND b.blocked_phone_hash = u.phone_hash)
  AND NOT EXISTS (SELECT 1 FROM phone_blocks b WHERE b.blocker_id = u.id AND b.blocked_phone_hash = :viewerPhoneHash)
  AND (:viewerFilter = 'everyone' OR u.gender = :viewerGender)
  AND (u.gender_filter_mode = 'everyone' OR u.gender = :viewerGender)
`;

export function viewerParams(viewer: UserRow) {
  return {
    viewerId: viewer.id,
    viewerGender: viewer.gender,
    viewerFilter: viewer.gender_filter_mode,
    viewerPhoneHash: viewer.phone_hash ?? "",
  };
}

export async function canSee(viewer: UserRow, targetId: string): Promise<boolean> {
  return !!(await get(`SELECT 1 AS ok FROM users u WHERE u.id = :targetId AND ${MUTUALLY_VISIBLE_SQL}`, { ...viewerParams(viewer), targetId }));
}

export const NOT_BLOCKED_SQL = (otherAlias: string) => /* sql */ `
  NOT EXISTS (SELECT 1 FROM phone_blocks b WHERE b.blocker_id = :viewerId AND b.blocked_phone_hash = ${otherAlias}.phone_hash)
  AND NOT EXISTS (SELECT 1 FROM phone_blocks b WHERE b.blocker_id = ${otherAlias}.id AND b.blocked_phone_hash = :viewerPhoneHash)
`;
