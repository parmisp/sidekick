# Sidekick demo

A working prototype of Sidekick, a swipe-based app for making friends at university. It's platonic, not dating. It's built so real people can click through the whole flow: sign up, build a profile, swipe, comment, match and chat.

> **This is a demo, not a production app.** Several pieces are mocked or simplified. See [Mocked / simplified for the demo](#mocked--simplified-for-the-demo) before this goes anywhere near real users.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000 (use your browser's phone emulation for the intended feel)
```

- No API keys, no external services. Locally, SQLite lives in `./data/sidekick.db` and is created and seeded with 30 student profiles on the first request. Uploaded photos go to `./data/uploads`.
- `npm run reset` wipes `./data` (database, uploads, generated secrets) for a clean slate.
- Requires Node 20.9+.

## Deploy to Vercel

Vercel's server disk is read-only and each request can land on a different short-lived server, so the deployed app needs a hosted database and hosted image storage. When the env vars below are set, the app uses them automatically. Without them it falls back to the local files above.

1. **Database (Turso).** In your Vercel project, go to **Storage → Create → Turso** (or create a database at turso.tech). Make sure the project has `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Tables and seed data are created automatically on the first request.
2. **Image storage (Vercel Blob).** Go to **Storage → Create → Blob** and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Public and private stores both work.
3. **Secrets.** Add two long random values, e.g. from `openssl rand -hex 32`:
   - `SESSION_SECRET` signs login cookies.
   - `PHONE_HASH_PEPPER` keys phone-number hashes. Never change it after launch, or existing phone blocks stop matching.
4. **Redeploy**, since env vars only apply to new deployments.

Pick a Turso region close to your Vercel function region (Settings → Functions), because every page makes several database queries.

## Try it

1. Sign up with any allow-listed email, e.g. `you@utoronto.ca` or anything ending in `.edu`. The code is always **`000000`**.
2. Enter any phone number, then build your profile. If you don't have 4 photos handy, the photo step has a demo button that fills the slots with placeholders.
3. **Discover**: tap **Friend** or **✕**. About 45% of seed profiles have "already liked" you, so a mutual match comes quickly and opens the chat. Seed profiles auto-reply after a few seconds.
4. **Comment**: tap the speech bubble on any photo, prompt or custom tag in a Discover card.
5. **Inbox**: three seed comments are waiting on your content. **Reply** creates a match and opens the chat. **Dismiss** removes the comment silently.
6. **Settings**: change the gender filter, block a number, and use the **demo tools** (skip ahead 30 days, reset swipes) to test the pass/re-appearance rule.

**See the other side:** log in as any seed profile with `firstname.lastname@sidekick-demo.edu` (e.g. `maya.chen@sidekick-demo.edu`) and code `000000`. Comments you left as your own user show up in their Inbox.

**Test phone blocking:** seed profiles have fake numbers `+1 (555) 010-0001` through `+1 (555) 010-0030`, in the same order as `SEED_USERS` in `lib/seed.ts`. `0001` is Maya Chen and `0002` is Jordan Okafor. After blocking, that person disappears from Discover, Inbox, Matches and Chat, in both directions.

## How it's built

| Area | Where |
| --- | --- |
| Next.js 16 App Router, React 19, Tailwind v4 | `app/`, `components/` |
| Design tokens (colours, fonts, shapes) | `app/globals.css`, `app/layout.tsx` |
| SQLite schema (raw SQL via `@libsql/client`: local file or Turso) | `lib/schema.ts`, `lib/db.ts` |
| Image uploads (local disk or Vercel Blob) | `lib/storage.ts`, `app/api/upload`, `app/api/uploads/[file]` |
| Seed data: tag taxonomy, 15 prompts, 30 profiles | `lib/seed.ts` |
| Signed-cookie session | `lib/auth.ts` |
| Deck composition, affinity score, pass/match rules | `lib/deck.ts` |
| Block + gender-filter visibility rules | `lib/visibility.ts` |
| Inbox, matches, chat queries | `lib/inbox.ts`, `lib/matches.ts`, `app/api/chat/[matchId]/route.ts` |
| Server actions (mutations) | `app/actions/*.ts` |
| Config: email allow-list, limits, cooldown | `lib/config.ts` |

I used plain SQL through `@libsql/client` instead of Prisma. The same code runs against a local SQLite file (so `npm install && npm run dev` is the whole setup) or a hosted Turso database, with no generate or migrate step. The tables match the requested data model. Two extra flags, `comments.dismissed_at` / `replied_at` and `matches.source`, record how each row was resolved or created.

### Product rules as implemented

- **Deck**: batches of up to 20. Every 4th card comes from a random discovery pool (profiles outside the top affinity slice). The other ~75% are ranked by affinity: shared major +3, age within 2 years +2, +1 per shared tag (max +4), same residence status +1. Ties are broken randomly.
- **Excluded from the deck**: people you've friend-swiped, existing matches, anyone in a 30-day pass cooldown, anyone permanently excluded, blocked pairs (either direction), and anyone outside the gender filter.
- **Gender filter is mutual**: someone who picked "same gender" is also hidden from people outside that setting. Users who pick "rather not say" can't enable the same-gender filter, because it would have nothing to match on.
- **Passes**: the first pass sets `cooldown_pending` with `passedAt = now`. After 30 days the person can appear once more, marked with a "Second look" banner. A second pass sets `permanently_excluded`. A friend swipe on the second appearance clears the pass and proceeds normally.
- **Matches**: created on a mutual friend swipe (you're taken straight to the chat) or when you reply to a comment. Each pair has at most one match. The chat starts with the "You and X are now friends" banner.
- **Comments**: can target a photo, a prompt or the custom tag, only for someone you're allowed to see. Dismissing is silent and doesn't change swipe or deck state.
- **Phone blocks**: numbers are normalized and stored as a keyed HMAC. The confirmation message is the same whether or not the number belongs to an account.
- **Validation**: all profile rules are enforced on the server as well as in the UI. That covers 4 photos, 3–5 tags, a custom tag of 20 characters or fewer, 3 distinct prompts each with a written answer (an image is optional), and age 18+.

## Mocked / simplified for the demo

None of these should be considered solved:

| Area | What the demo does | What's needed before launch |
| --- | --- | --- |
| **Email verification** | Always accepts `000000`. No email is sent. (`app/actions/auth.ts`, marked `TODO`) | A real provider, random single-use codes with expiry, rate limiting per email and IP, and domain allow-list management per school |
| **Phone number** | Stored as typed, with no SMS verification. Normalization assumes 10-digit numbers are North American (`lib/phone.ts`) | SMS verification, E.164 parsing (e.g. libphonenumber), and encryption at rest for the raw number (or don't keep it at all) |
| **Image storage** | Local disk in dev, Vercel Blob when deployed. Every image is served through an app route (no CDN), and replaced photos are never deleted. Seed photos are generated SVG placeholders | CDN delivery, EXIF/location stripping, size and format processing, deletion on replacement and account removal |
| **Content moderation** | A tiny word-list filter on names, majors, tags, prompt answers and comments (`lib/moderation.ts`). Chat messages and **images are not moderated at all** | Real text and image moderation (including nudity and CSAM detection), plus report and block-user flows, a review queue and rate limits on comments |
| **Auth / sessions** | An HMAC-signed cookie. Secrets come from `SESSION_SECRET` / `PHONE_HASH_PEPPER`, or are auto-generated into `data/.secrets.json` for local dev | A vetted session library, managed secrets, revocation, CSRF review, account deletion |
| **Real-time chat** | The client polls every 2s | Websockets/SSE, push notifications, delivery and read state |
| **Simulated activity** | When you finish your profile, seed users "like" you and leave 3 comments. Seed users auto-reply in chat (`lib/demo.ts`) | Delete `lib/demo.ts` and its call sites (marked `DEMO`) |
| **Demo tools** | "Skip ahead 30 days" and "Reset my swipes" in Settings | Remove (`app/actions/settings.ts`, `DemoTools`) |
| **Database** | SQLite (local file or Turso). The schema is created with `CREATE TABLE IF NOT EXISTS` on startup, with no migrations | A managed database, migrations, backups, indexes tuned for real load |
| **Safety & policy** | Age is self-reported (18+ enforced) | Age and student-status assurance, terms and privacy flows, data-retention policy |
| **Deck scale** | Scores every eligible user in memory on each load | Precomputed candidates and pagination once there are more than a few thousand users per campus |

Run `grep -rn "DEMO\|TODO" app lib` to find every marked stand-in.
