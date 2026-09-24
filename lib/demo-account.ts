import { DEMO_EMAIL } from "./config";
import { newId, run, tx } from "./db";

/** Start a fresh demo identity, invalidating cookies for the previous demo run. */
export async function resetDemoAccount() {
  const id = newId();
  await tx(async (t) => {
    await run("DELETE FROM users WHERE email = ?", [DEMO_EMAIL], t);
    await run("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)", [id, DEMO_EMAIL, Date.now()], t);
  });
  return { id, phone: null, profile_complete: 0 };
}

export async function clearDemoAccount(userId: string) {
  // Both conditions are required: this can never erase a normal account.
  await run("DELETE FROM users WHERE id = ? AND email = ?", [userId, DEMO_EMAIL]);
}
