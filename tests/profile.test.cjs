/* eslint-disable @typescript-eslint/no-require-imports */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const { createClient } = require("@libsql/client");

// Compile the real server code while providing only a test session.
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
let activeUserId = "test-student";
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === "@/lib/auth") return {
    getCurrentUser: () => get("SELECT * FROM users WHERE id = ?", [activeUserId]),
    assertOnboardedUser: () => get("SELECT * FROM users WHERE id = ?", [activeUserId]),
    getUserById: (id) => get("SELECT * FROM users WHERE id = ?", [id]),
  };
  if (request === "next/cache") return { revalidatePath() {} };
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, ...args);
};
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sidekick-profile-"));
process.chdir(temp);
delete process.env.TURSO_DATABASE_URL;
delete process.env.VERCEL;
process.env.SESSION_SECRET = "test-only-session-secret";
process.env.PHONE_HASH_PEPPER = "test-only-phone-pepper";
const { SCHEMA } = require("../lib/schema.ts");
const { db, get, run } = require("../lib/db.ts");
const { saveProfile } = require("../app/actions/profile.ts");
const { getProfile } = require("../lib/profiles.ts");

before(async () => {
  fs.mkdirSync(path.join(temp, "data"));
  const oldDb = createClient({ url: `file:${path.join(temp, "data", "sidekick.db")}` });
  // Reproduce a database created before hometown existed, with an existing user.
  await oldDb.executeMultiple(SCHEMA.replace("  hometown           TEXT,\n", "").replace("  residence_id       TEXT,\n", "").replace("  main_campus        TEXT,\n", "").replace("  degree             TEXT,\n", "").replace("  is_active          INTEGER NOT NULL DEFAULT 1,\n", ""));
  await oldDb.execute("INSERT INTO users (id, email, phone, is_seed, created_at) VALUES ('test-student', 'student@my.yorku.ca', '5550109999', 1, 1)");
  await oldDb.execute("INSERT INTO users (id, email, name, profile_complete, created_at) VALUES ('legacy-real-student', 'legacy@my.yorku.ca', 'Existing Student', 1, 1)");
  oldDb.close();
  await db();
});
after(async () => {
  (await db()).close();
  Module._load = originalLoad;
  process.chdir(originalCwd);
  fs.rmSync(temp, { recursive: true, force: true });
});

const input = () => ({
  name: "Alex", age: 19, major: "Psychology", mainCampus: "keele", degree: "BA", hometown: " Toronto ",
  residenceStatus: "commuter", residenceId: null, gender: "rather_not_say", genderFilterMode: "everyone",
  photos: [0, 1, 2, 3].map((i) => `/api/placeholder/test-${i}`),
  tagIds: [1, 2, 3], customTag: "Coffee lover",
  prompts: [1, 2, 3].map((id) => ({ promptId: id, answer: "Let’s get coffee", imageUrl: null })),
});

test("existing databases gain hometown without losing accounts", async () => {
  const user = await get("SELECT email, hometown, residence_id FROM users WHERE id = 'test-student'");
  assert.equal(user.email, "student@my.yorku.ca");
  assert.equal(user.hometown, null);
  assert.equal(user.residence_id, null);
});

test("completed signup persists every section and supports editing hometown", async () => {
  assert.deepEqual(await saveProfile(input()), { ok: true });
  const profile = await getProfile("test-student");
  assert.equal(profile.name, "Alex");
  assert.equal(profile.age, 19);
  assert.equal(profile.mainCampus, "keele");
  assert.equal(profile.degree, "BA");
  assert.equal(profile.hometown, "Toronto");
  assert.equal(profile.residenceStatus, "commuter");
  assert.equal(profile.photos.length, 4);
  assert.equal(profile.prompts.length, 3);
  assert.equal(profile.interests.length, 3);
  const user = await get("SELECT profile_complete FROM users WHERE id = 'test-student'");
  assert.equal(user.profile_complete, 1);
  assert.equal((await saveProfile({ ...input(), hometown: "Ottawa" })).ok, true);
  assert.equal((await getProfile("test-student")).hometown, "Ottawa");
});

test("hometown and residence can be skipped or cleared", async () => {
  assert.equal((await saveProfile({ ...input(), hometown: "", residenceStatus: null })).ok, true);
  const profile = await getProfile("test-student");
  assert.equal(profile.hometown, null);
  assert.equal(profile.residenceStatus, null);
});

test("invalid signup cannot mark the account complete", async () => {
  await run("UPDATE users SET profile_complete = 0 WHERE id = 'test-student'");
  for (const patch of [
    { mainCampus: null }, { mainCampus: "fake-campus" }, { degree: null }, { degree: "fake-degree" },
    { age: 17 }, { hometown: "x".repeat(81) }, { major: "" },
    { prompts: input().prompts.map((p) => ({ ...p, promptId: 1 })) },
    { prompts: input().prompts.map((p) => ({ ...p, answer: "" })) },
  ]) assert.equal((await saveProfile({ ...input(), ...patch })).ok, false);
  assert.equal((await get("SELECT profile_complete FROM users WHERE id = 'test-student'")).profile_complete, 0);
});


test("restarting the demo clears its profile and activity but preserves other users", async () => {
  const { resetDemoAccount, clearDemoAccount } = require("../lib/demo-account.ts");
  const demo = await resetDemoAccount();
  await run("UPDATE users SET name = 'Demo Person', age = 21, phone = '5550102222', hometown = 'Toronto', profile_complete = 1 WHERE id = ?", [demo.id]);
  await run("INSERT INTO photos (id, user_id, url, position) VALUES ('demo-photo', ?, '/api/placeholder/demo', 0)", [demo.id]);
  await run("INSERT INTO swipes (id, swiper_id, swipee_id, direction, created_at) VALUES ('demo-swipe', ?, 'test-student', 'friend', 1)", [demo.id]);
  const fresh = await resetDemoAccount();
  assert.notEqual(fresh.id, demo.id);
  assert.equal(await get("SELECT id FROM users WHERE id = ?", [demo.id]), null);
  const row = await get("SELECT * FROM users WHERE id = ?", [fresh.id]);
  for (const field of ["name", "age", "phone", "hometown"]) assert.equal(row[field], null);
  assert.equal(row.profile_complete, 0);
  assert.equal(await get("SELECT id FROM photos WHERE id = 'demo-photo'"), null);
  assert.equal(await get("SELECT id FROM swipes WHERE id = 'demo-swipe'"), null);
  await clearDemoAccount("test-student");
  assert.ok(await get("SELECT id FROM users WHERE id = 'test-student'"));
  // Signing out an older demo session must not delete a newer run.
  await clearDemoAccount(demo.id);
  assert.ok(await get("SELECT id FROM users WHERE id = ?", [fresh.id]));
  await clearDemoAccount(fresh.id);
  assert.equal(await get("SELECT id FROM users WHERE id = ?", [fresh.id]), null);
});


test("residence names reach only resident viewers, in single and batch profiles", async () => {
  const { getProfiles } = require("../lib/profiles.ts");
  assert.equal((await saveProfile({ ...input(), residenceStatus: "residence", residenceId: "york-tatham" })).ok, true);
  const resident = { residence_status: "residence" };
  assert.equal((await getProfile("test-student", resident)).residenceName, "Tatham Hall");
  assert.equal((await getProfiles(["test-student"], resident))[0].residenceName, "Tatham Hall");
  for (const viewer of [{ residence_status: "commuter" }, { residence_status: null }, null, undefined]) {
    const profile = await getProfile("test-student", viewer);
    assert.equal(profile.residenceStatus, "residence");
    assert.equal(profile.residenceName, null);
    assert.equal(JSON.stringify(profile).includes("york-tatham"), false);
    assert.equal(JSON.stringify(profile).includes("Tatham Hall"), false);
    assert.equal((await getProfiles(["test-student"], viewer))[0].residenceName, null);
  }
});

test("residence choice is optional, validated, and cleared on switching to commuter", async () => {
  assert.equal((await saveProfile({ ...input(), residenceStatus: "residence", residenceId: null })).ok, true);
  assert.equal((await getProfile("test-student", { residence_status: "residence" })).residenceName, null);
  assert.equal((await saveProfile({ ...input(), residenceStatus: "residence", residenceId: "fake-building" })).ok, false);
  await saveProfile({ ...input(), residenceStatus: "residence", residenceId: "york-wood" });
  assert.equal((await get("SELECT residence_id FROM users WHERE id = 'test-student'")).residence_id, "york-wood");
  for (const residenceStatus of ["commuter", null]) {
    // Even a stale or manipulated client cannot retain a building when not in residence.
    assert.equal((await saveProfile({ ...input(), residenceStatus, residenceId: "york-wood" })).ok, true);
    assert.equal((await get("SELECT residence_id FROM users WHERE id = 'test-student'")).residence_id, null);
    assert.equal((await getProfile("test-student", { residence_status: "residence" })).residenceName, null);
  }
});


test("academic migration leaves real answers blank and populates fictional seeds", async () => {
  const legacy = await get("SELECT name, main_campus, degree FROM users WHERE id = 'legacy-real-student'");
  assert.equal(legacy.name, "Existing Student");
  assert.equal(legacy.main_campus, null);
  assert.equal(legacy.degree, null);
  const { all } = require("../lib/db.ts");
  const campuses = await all("SELECT DISTINCT main_campus FROM users WHERE is_seed = 1");
  assert.deepEqual(campuses.map((row) => row.main_campus).sort(), ["glendon", "keele", "markham"]);
});

test("campus and degree can be edited and returned on the profile", async () => {
  for (const mainCampus of ["keele", "glendon", "markham"]) {
    assert.equal((await saveProfile({ ...input(), mainCampus, degree: "PhD" })).ok, true);
    const profile = await getProfile("test-student");
    assert.equal(profile.mainCampus, mainCampus);
    assert.equal(profile.degree, "PhD");
  }
});

test("campus is the strongest individual preference but a strong cross-campus match can win", () => {
  const { affinityScore } = require("../lib/deck.ts");
  const viewer = { id: "viewer", main_campus: "keele", age: 20, major: "Psychology", residence_status: "commuter" };
  const campusOnly = { id: "same-campus", main_campus: "keele", age: 30, major: "Biology", residence_status: "residence" };
  const crossCampus = { ...viewer, id: "cross-campus", main_campus: "markham" };
  const tags = new Set([1, 2, 3, 4]);
  assert.equal(affinityScore(viewer, campusOnly, tags, []), 40);
  assert.equal(affinityScore(viewer, crossCampus, tags, [1, 2, 3, 4]), 60);
  assert.equal(affinityScore(viewer, { ...crossCampus, main_campus: "keele" }, tags, [1, 2, 3, 4]), 100);
  assert.equal(affinityScore({ ...viewer, main_campus: null }, { ...crossCampus, main_campus: null }, tags, []), 35);
});

test("Discover includes compatible students across campuses", async () => {
  const { buildDeck, isEligible } = require("../lib/deck.ts");
  await saveProfile({ ...input(), mainCampus: "keele" });
  await run("INSERT INTO users (id, email, name, age, major, main_campus, degree, residence_status, gender, profile_complete, created_at) VALUES ('cross-campus', 'cross@my.yorku.ca', 'Cross Campus', 19, 'Psychology', 'markham', 'BA', 'commuter', 'male', 1, 1)");
  for (const id of [1, 2, 3]) await run("INSERT INTO user_interests (user_id, tag_id) VALUES ('cross-campus', ?)", [id]);
  const viewer = await get("SELECT * FROM users WHERE id = 'test-student'");
  assert.equal(await isEligible(viewer, "cross-campus"), true);
  const deck = await buildDeck(viewer);
  assert.ok(deck.some((card) => card.profile.id === "cross-campus"));
  assert.ok(deck.some((card) => card.profile.mainCampus === "keele"));
});


test("a prompt reply becomes a friendship only when its recipient responds, without swipes", async () => {
  const { addComment, replyToComment } = require("../app/actions/comments.ts");
  const { listInbox } = require("../lib/inbox.ts");
  await run("INSERT INTO user_prompts (id, user_id, prompt_id, answer_text, position) VALUES ('friendship-prompt', 'cross-campus', 1, 'A coffee and a long walk', 0)");
  activeUserId = "test-student";
  assert.equal((await addComment("cross-campus", "prompt", "friendship-prompt", "Where is your favourite coffee spot?")).ok, true);
  const recipient = await get("SELECT * FROM users WHERE id = 'cross-campus'");
  const item = (await listInbox(recipient)).find((comment) => comment.targetType === "prompt");
  assert.ok(item);
  assert.equal(item.text, "Where is your favourite coffee spot?");
  assert.equal(item.targetPreview, "A coffee and a long walk");
  assert.equal(await get("SELECT id FROM matches WHERE user_a_id = 'cross-campus' AND user_b_id = 'test-student'"), null);
  // The sender cannot accept their own request on the other person's behalf.
  assert.equal((await replyToComment(item.id)).ok, false);
  activeUserId = "cross-campus";
  const accepted = await replyToComment(item.id);
  assert.equal(accepted.ok, true);
  const match = await get("SELECT * FROM matches WHERE id = ?", [accepted.matchId]);
  assert.equal(match.source, "comment");
  assert.equal(match.source_comment_id, item.id);
  assert.equal((await listInbox(recipient)).some((comment) => comment.id === item.id), false);
  assert.equal((await replyToComment(item.id)).ok, false);
  activeUserId = "test-student";
  assert.equal((await addComment("test-student", "prompt", "friendship-prompt", "Hello")).ok, false);
  assert.equal((await addComment("cross-campus", "prompt", "missing-prompt", "Hello")).ok, false);
});


test("blocking before Discover hides both users, including when the blocked number joins later", async () => {
  const { blockPhone } = require("../app/actions/settings.ts");
  const { hashPhone, normalizePhone } = require("../lib/phone.ts");
  const { canSee } = require("../lib/visibility.ts");
  const { buildDeck } = require("../lib/deck.ts");
  activeUserId = "test-student";
  assert.equal((await blockPhone("12")).ok, false);
  const beforeJoin = await blockPhone("(416) 555-0199");
  assert.equal(beforeJoin.ok, true);
  await run("INSERT INTO users (id, email, name, age, major, main_campus, degree, gender, phone_hash, profile_complete, created_at) VALUES ('blocked-later', 'later@my.yorku.ca', 'Later Student', 19, 'Psychology', 'keele', 'BA', 'male', ?, 1, 1)", [hashPhone(normalizePhone("4165550199"))]);
  const afterJoin = await blockPhone("+1 416 555 0199");
  assert.deepEqual(afterJoin, beforeJoin);
  const viewer = await get("SELECT * FROM users WHERE id = 'test-student'");
  const blocked = await get("SELECT * FROM users WHERE id = 'blocked-later'");
  assert.equal(await canSee(viewer, blocked.id), false);
  assert.equal(await canSee(blocked, viewer.id), false);
  assert.equal(await canSee(viewer, "cross-campus"), true);
  assert.equal((await buildDeck(viewer)).some((card) => card.profile.id === blocked.id), false);
  const count = await get("SELECT COUNT(*) AS n FROM phone_blocks WHERE blocker_id = ?", [viewer.id]);
  assert.equal(count.n, 1);
});

test("an email cannot create a second account through case or whitespace variants", async () => {
  await run("INSERT OR IGNORE INTO users (id, email, created_at) VALUES ('duplicate-email', ' STUDENT@MY.YORKU.CA ', 1)");
  assert.equal(await get("SELECT id FROM users WHERE id = 'duplicate-email'"), null);
  assert.equal((await get("SELECT COUNT(*) AS n FROM users WHERE lower(trim(email)) = 'student@my.yorku.ca'")).n, 1);
  await assert.rejects(run("UPDATE users SET email = 'STUDENT@MY.YORKU.CA' WHERE id = 'cross-campus'"), /EMAIL_ALREADY_LINKED/);
});

test("phone ownership is unique across formatting variants and repeat saves by the owner work", async () => {
  const { savePhone } = require("../app/actions/auth.ts");
  activeUserId = "test-student";
  assert.equal((await savePhone("(647) 555-0123")).ok, true);
  assert.equal((await savePhone("+1 647 555 0123")).ok, true);
  activeUserId = "cross-campus";
  const duplicate = await savePhone("6475550123");
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already linked/);
  assert.equal((await savePhone("(647) 555-0124")).ok, true);
  assert.equal((await savePhone(null)).ok, false);
  assert.equal((await savePhone("12")).ok, false);
  activeUserId = "test-student";
});

test("database rejects concurrent phone claims and direct duplicate inserts", async () => {
  const { hashPhone } = require("../lib/phone.ts");
  const phoneHash = hashPhone("16475550125");
  const results = await Promise.allSettled([
    run("UPDATE users SET phone_hash = ? WHERE id = 'test-student'", [phoneHash]),
    run("UPDATE users SET phone_hash = ? WHERE id = 'cross-campus'", [phoneHash]),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await get("SELECT COUNT(*) AS n FROM users WHERE phone_hash = ?", [phoneHash])).n, 1);
  await assert.rejects(run("INSERT INTO users (id, email, phone_hash, created_at) VALUES ('duplicate-phone', 'unique@my.yorku.ca', ?, 1)", [phoneHash]), /PHONE_ALREADY_LINKED/);
});


test("deactivation hides both directions and pauses matches without deleting data", async () => {
  const { setAccountActive } = require("../app/actions/settings.ts");
  const { canSee } = require("../lib/visibility.ts");
  const { buildDeck } = require("../lib/deck.ts");
  const { listMatches, getMatchForViewer } = require("../lib/matches.ts");
  const { listInbox } = require("../lib/inbox.ts");
  activeUserId = "test-student";
  const viewer = await get("SELECT * FROM users WHERE id = ?", [activeUserId]);
  const other = await get("SELECT * FROM users WHERE id = 'cross-campus'");
  const matchesBefore = await listMatches(viewer);
  assert.ok(matchesBefore.length);
  const matchId = matchesBefore[0].id;
  const profileBefore = await getProfile(viewer.id);
  assert.equal((await setAccountActive(false)).ok, true);
  assert.equal((await get("SELECT is_active FROM users WHERE id = ?", [viewer.id])).is_active, 0);
  assert.equal(await canSee(viewer, other.id), false);
  assert.equal(await canSee(other, viewer.id), false);
  assert.deepEqual(await buildDeck(viewer), []);
  assert.deepEqual(await listMatches(viewer), []);
  assert.deepEqual(await listInbox(viewer), []);
  assert.equal(await getMatchForViewer(other, matchId), null);
  assert.equal(await getProfile(viewer.id), null);
  assert.equal((await buildDeck(other)).some((card) => card.profile.id === viewer.id), false);
  assert.equal((await setAccountActive(true)).ok, true);
  assert.deepEqual(await getProfile(viewer.id), profileBefore);
  assert.deepEqual(await listMatches(viewer), matchesBefore);
  assert.equal(await canSee(viewer, other.id), true);
  assert.equal((await setAccountActive("false")).ok, false);
  activeUserId = "missing-session";
  assert.equal((await setAccountActive(false)).ok, false);
  activeUserId = "test-student";
});

test("Discover navigation, inbox and chats bind only parameters present in their SQL", async () => {
  const { countUnreadInbox, listInbox, getInboxItem } = require("../lib/inbox.ts");
  const { listMatches, getMatchForViewer } = require("../lib/matches.ts");
  const { buildDeck } = require("../lib/deck.ts");
  const client = await db();
  const originalExecute = client.execute;
  // Local SQLite tolerates surplus names. Enforce the hosted database contract
  // while still executing the real queries against the integration fixtures.
  client.execute = function(statement, ...args) {
    if (typeof statement === "object" && statement.args && !Array.isArray(statement.args)) {
      const names = [...new Set([...statement.sql.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]))];
      assert.deepEqual(Object.keys(statement.args).sort(), names.sort(), "SQL bindings must match its named parameters");
    }
    return originalExecute.call(this, statement, ...args);
  };
  try {
    const viewer = await get("SELECT * FROM users WHERE id = 'test-student'");
    assert.equal(typeof await countUnreadInbox(viewer), "number");
    await buildDeck(viewer);
    await listInbox(viewer);
    assert.equal(await getInboxItem(viewer, "missing-comment"), null);
    const matches = await listMatches(viewer);
    assert.ok(matches.length);
    assert.equal((await getMatchForViewer(viewer, matches[0].id)).id, matches[0].id);
  } finally {
    client.execute = originalExecute;
  }
});
