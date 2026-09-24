/* eslint-disable @typescript-eslint/no-require-imports */
// Run real SQLite verification logic with mocked email delivery, in a temp directory.
const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sidekick-verification-"));
process.chdir(temp);
delete process.env.TURSO_DATABASE_URL;
delete process.env.VERCEL;
process.env.SESSION_SECRET = "test-only-session-secret";
process.env.PHONE_HASH_PEPPER = "test-only-phone-pepper";
const { requestVerification, consumeVerification } = require("../lib/verification.ts");
const { db, get, run } = require("../lib/db.ts");
const originalFetch = global.fetch;
let messages = [];
beforeEach(async () => {
  await run("DELETE FROM email_verifications");
  messages = [];
  process.env.RESEND_API_KEY = "test-only-api-key";
  process.env.EMAIL_FROM = "Sidekick <test@example.com>";
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    messages.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: "mock-email-id" }), { status: 200 });
  };
});
after(async () => {
  (await db()).close();
  global.fetch = originalFetch;
  process.chdir(originalCwd);
  fs.rmSync(temp, { recursive: true, force: true });
});
const email = "student@my.yorku.ca";
const sentCode = () => messages.at(-1).text.match(/\b\d{6}\b/)[0];
const allowResend = () => run("UPDATE email_verifications SET sent_at = sent_at - 61000");

test("only the exact demo account accepts 000000 without email setup", async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal((await requestVerification(" DEMO@MY.YORKU.CA ")).ok, true);
  assert.equal((await consumeVerification(" DEMO@MY.YORKU.CA ", "000000")).ok, true);
  assert.equal((await consumeVerification("demo@my.yorku.ca", "123456")).ok, false);
  for (const address of [email, "demo+other@my.yorku.ca", "demo@other.yorku.ca", "maya.chen@sidekick-demo.edu"]) {
    assert.equal((await consumeVerification(address, "000000")).ok, false);
  }
  assert.equal((await requestVerification(email)).ok, false);
  assert.equal(messages.length, 0);
});

test("emailed code is normalized, hashed, email-bound and single-use", async () => {
  assert.equal((await requestVerification(" Student@My.Yorku.ca ")).ok, true);
  assert.deepEqual(messages[0].to, [email]);
  const code = sentCode();
  assert.notEqual(code, "000000");
  const row = await get("SELECT code_hash FROM email_verifications WHERE email = ?", [email]);
  assert.notEqual(row.code_hash, code);
  assert.equal((await consumeVerification("someone@my.yorku.ca", code)).ok, false);
  assert.equal((await consumeVerification(email, "000000")).ok, false);
  assert.equal((await consumeVerification(email, code)).ok, true);
  assert.equal((await consumeVerification(email, code)).ok, false);
});

test("expired codes and codes after five guesses fail", async () => {
  await requestVerification(email);
  const code = sentCode();
  for (let i = 0; i < 5; i++) assert.equal((await consumeVerification(email, "000000")).ok, false);
  assert.equal((await consumeVerification(email, code)).ok, false);
  await allowResend();
  await requestVerification(email);
  await run("UPDATE email_verifications SET expires_at = ?", [Date.now() - 1]);
  assert.equal((await consumeVerification(email, sentCode())).ok, false);
});

test("resends replace old codes and enforce cooldown and hourly cap", async () => {
  await requestVerification(email);
  const old = await get("SELECT nonce FROM email_verifications WHERE email = ?", [email]);
  assert.equal((await requestVerification(email)).ok, false);
  for (let i = 0; i < 4; i++) {
    await allowResend();
    assert.equal((await requestVerification(email)).ok, true);
  }
  const fresh = await get("SELECT nonce FROM email_verifications WHERE email = ?", [email]);
  assert.notEqual(fresh.nonce, old.nonce);
  await allowResend();
  assert.equal((await requestVerification(email)).ok, false);
  assert.equal(messages.length, 5);
  await run("UPDATE email_verifications SET window_start = window_start - 3600001");
  assert.equal((await requestVerification(email)).ok, true);
});

test("provider failure never enables a code or reports success", async () => {
  global.fetch = async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return new Response("unavailable", { status: 503 });
  };
  assert.equal((await requestVerification(email)).ok, false);
  assert.equal((await consumeVerification(email, sentCode())).ok, false);
});

test("concurrent verification consumes a code only once", async () => {
  await requestVerification(email);
  const code = sentCode();
  const results = await Promise.all([consumeVerification(email, code), consumeVerification(email, code)]);
  assert.equal(results.filter((r) => r.ok).length, 1);
});

test("invalid inputs cannot send email or authenticate", async () => {
  for (const address of [null, "not-an-email", "user@gmail.com", "user@yorku.ca.attacker.com"]) {
    assert.equal((await requestVerification(address)).ok, false);
    assert.equal((await consumeVerification(address, "000000")).ok, false);
  }
  assert.equal(messages.length, 0);
});
