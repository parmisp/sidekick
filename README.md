# Sidekick demo

A working prototype of Sidekick, a swipe-based app for making friends at university. It's platonic, not dating. It's built so real people can click through the whole flow: sign up, build a profile, swipe, comment, match and chat.

> **This is a demo, not a production app.** Several pieces are mocked or simplified. See [Mocked / simplified for the demo](#mocked--simplified-for-the-demo) before this goes anywhere near real users.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000 (use your browser's phone emulation for the intended feel)
```

- The demo login needs no API keys. Other email sign-ins require Resend (see below). Locally, SQLite lives in `./data/sidekick.db` and is created and seeded with 30 student profiles on the first request. Uploaded photos go to `./data/uploads`.
- `npm run reset` wipes `./data` (database, uploads, generated secrets) for a clean slate.
- Requires Node 20.9+.

## Deploy to Vercel

Vercel's server disk is read-only and each request can land on a different short-lived server, so the deployed app needs a hosted database and hosted image storage. When the env vars below are set, the app uses them automatically. Without them it falls back to the local files above.

1. **Database (Turso).** In your Vercel project, go to **Storage → Create → Turso** (or create a database at turso.tech). Make sure the project has `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Tables and seed data are created automatically on the first request.
2. **Image storage (Vercel Blob).** Go to **Storage → Create → Blob** and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Public and private stores both work.
3. **Secrets.** Add two long random values, e.g. from `openssl rand -hex 32`:
   - `SESSION_SECRET` signs login cookies.
   - `PHONE_HASH_PEPPER` keys phone-number hashes. Never change it after launch, or existing phone blocks stop matching.
4. **Email (Resend).** Add `RESEND_API_KEY` and `EMAIL_FROM` using a verified sending domain (see below).
5. **Redeploy**, since env vars only apply to new deployments.

Pick a Turso region close to your Vercel function region (Settings → Functions), because every page makes several database queries.

## Set up verification emails

1. Create a [Resend account](https://resend.com) and [verify a sending domain](https://resend.com/docs/dashboard/domains/introduction) you control. Student recipients can use York emails; the sender must use your own verified domain.
2. Create a Resend API key with permission to send email.
3. Put these values in `.env.local` locally, and in your Vercel project's environment variables when deployed:

```dotenv
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="Sidekick <signin@your-verified-domain.com>"
```

Use your real verified sender address. Keep the API key private; `.env.local` is ignored by Git. Restart the dev server or redeploy after setting these values. The integration uses the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).

Without these settings, normal email sign-in shows an unavailable message rather than pretending to send a code. The demo account still works. A new code replaces the previous code; codes expire after 10 minutes and can be used once. Failed sends also count toward the send limit.

`npm test` checks verification against an isolated temporary SQLite database with mocked email delivery. To check real delivery after configuration, sign in with a university inbox you own and use the code received there.

## Try it

1. Sign in as **`demo@my.yorku.ca`** with code **`000000`**. This is the only account with a fixed code. Each demo sign-in starts a blank profile. Use **Start demo over** on setup or your profile to try different answers; signing out clears the demo account too. Answers are stored during the demo so you can preview the profile. The demo account is shared, so restarting it also resets any other browser using that account. Uploaded image files are not deleted by the reset. Other allow-listed university emails receive a real code once email delivery is configured.
2. Enter a phone number, then build your profile in short steps: name and age; main campus, major, degree, hometown and campus life; preferences; interests; photos; and three prompts shown one at a time. Next and Back keep your answers while you move between steps. Hometown and residence status are optional. If you don't have 4 photos handy, the photo step has a demo button that fills the slots with placeholders.
Before Discover, an optional screen lets you block phone numbers privately. Add as many as needed, then choose **Continue**, or **Skip for now**. Both lead to a short tutorial covering the ✓ Friend button, scrolling through a profile, X to pass, and replying to prompts. **Got it — let’s go!** opens Discover. Blocking is also available later in Settings.

3. **Discover**: tap **Friend** or **✕**. About 45% of seed profiles have "already liked" you, so a mutual match comes quickly and opens the chat. Seed profiles auto-reply after a few seconds.
4. **Start a friendship**: tap **Reply to prompt** below a prompt in Discover and send a message about their answer. It goes to their Inbox. If they choose **Reply & become friends**, a friendship is created and chat opens, without a mutual swipe. You can also tap the speech bubble on a photo or custom tag.
5. **Inbox**: three seed comments are waiting on your content. **Reply** creates a match and opens the chat. **Dismiss** removes the comment silently.
6. **Settings**: change the gender filter, block a number, and use the **demo tools** (skip ahead 30 days, reset swipes) to test the pass/re-appearance rule.

Seed profiles still simulate activity, but no longer have a fixed-code login bypass.

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

- **Deck**: batches of up to 20. Every 4th card comes from a random discovery pool (profiles outside the top affinity slice). The other ~75% are ranked by affinity: same main campus 40 points, shared interests up to 25 points (4 shared interests earns the full weight), shared major 20 points, age within 2 years 10 points, and same residence status 5 points. Campus is 40% of the maximum compatibility score, not a campus quota or restriction. A strong cross-campus match can outrank a same-campus match; all three campuses remain eligible. Ties are broken randomly.
- **Excluded from the deck**: people you've friend-swiped, existing matches, anyone in a 30-day pass cooldown, anyone permanently excluded, blocked pairs (either direction), and anyone outside the gender filter.
- **Academics**: main campus (Keele, Glendon or Markham) and degree are required alongside major. Degree choices include BA, BSc, BEng, MA, MSc, PhD and others, plus Other and Undecided. Profiles show campus and “Major · Degree.” Existing users fill in the new answers when they next enter the app, with their previous profile prefilled.
- **Residence names**: selecting “In residence” reveals an optional York residence picker (Keele and Glendon undergraduate residences). Only viewers who also select “In residence” receive the building name; commuters and viewers with no residence status only see “Lives in residence.” This is enforced in the server profile data, including Discover, Inbox and friend profiles. Switching to commuter or clearing the living situation removes the saved building. Residence status is self-reported.
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
| **Email verification** | Resend delivers random, hashed, single-use codes with a 10-minute expiry, 5 guesses per code, a 60-second resend cooldown and 5 sends per email per hour. Only `demo@my.yorku.ca` accepts `000000` | Configure Resend; add infrastructure-level IP abuse protection and school domain management. Remove the shared demo account before a public launch |
| **Phone number** | Stored as typed, with no SMS verification. Normalization assumes 10-digit numbers are North American (`lib/phone.ts`) | SMS verification, E.164 parsing (e.g. libphonenumber), and encryption at rest for the raw number (or don't keep it at all) |
| **Image storage** | Local disk in dev, Vercel Blob when deployed. Every image is served through an app route (no CDN), and replaced photos are never deleted. Seed photos are generated SVG placeholders | CDN delivery, EXIF/location stripping, size and format processing, deletion on replacement and account removal |
| **Content moderation** | A tiny word-list filter on names, majors, tags, prompt answers and comments (`lib/moderation.ts`). Chat messages and **images are not moderated at all** | Real text and image moderation (including nudity and CSAM detection), plus report and block-user flows, a review queue and rate limits on comments |
| **Auth / sessions** | An HMAC-signed cookie. Secrets come from `SESSION_SECRET` / `PHONE_HASH_PEPPER`, or are auto-generated into `data/.secrets.json` for local dev | A vetted session library, managed secrets, revocation, CSRF review, account deletion |
| **Real-time chat** | The client polls every 2s | Websockets/SSE, push notifications, delivery and read state |
| **Simulated activity** | When you finish your profile, seed users "like" you and leave 3 comments. Seed users auto-reply in chat (`lib/demo.ts`) | Delete `lib/demo.ts` and its call sites (marked `DEMO`) |
| **Demo tools** | "Skip ahead 30 days" and "Reset my swipes" in Settings | Remove (`app/actions/settings.ts`, `DemoTools`) |
| **Database** | SQLite (local file or Turso). The schema is created on startup; additive migrations add hometown, residence choice, main campus and degree to existing databases | A managed database, migrations, backups, indexes tuned for real load |
| **Safety & policy** | Age is self-reported (18+ enforced) | Age and student-status assurance, terms and privacy flows, data-retention policy |
| **Deck scale** | Scores every eligible user in memory on each load | Precomputed candidates and pagination once there are more than a few thousand users per campus |

Run `grep -rn "DEMO\|TODO" app lib` to find every marked stand-in.
