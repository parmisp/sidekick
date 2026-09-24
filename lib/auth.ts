import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get } from "./db";
import { getSecrets } from "./secrets";
import type { UserRow } from "./types";

// DEMO: a minimal HMAC-signed cookie session ("userId.expiresAt.signature").
// Before launch: use a vetted session library, rotateable keys, server-side
// session revocation, and rate limiting on login/verification.
const COOKIE = "sk_session";
const MAX_AGE_S = 30 * 24 * 60 * 60;

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecrets().sessionSecret).update(payload).digest("base64url");
}

export async function setSession(userId: string) {
  const expires = Date.now() + MAX_AGE_S * 1000;
  const payload = `${userId}.${expires}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [userId, expires, signature] = token.split(".");
  if (!userId || !expires || !signature) return null;
  const expected = sign(`${userId}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

export function getUserById(id: string): Promise<UserRow | null> {
  return get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const id = await getSessionUserId();
  return id ? getUserById(id) : null;
}

/** For pages: signed-in user who has finished onboarding, otherwise redirect to the right step. */
export async function requireOnboardedUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.phone) redirect("/login/phone");
  if (!user.profile_complete || !user.main_campus || !user.degree) redirect("/setup");
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertOnboardedUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user || !user.profile_complete || !user.main_campus || !user.degree) throw new Error("Finish setting up your profile first.");
  return user;
}
