// SQLite schema. All timestamps are unix epoch milliseconds.
export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  phone              TEXT,             -- stored for block-matching only, never rendered
  phone_hash         TEXT,
  name               TEXT,
  age                INTEGER,
  major              TEXT,
  gender             TEXT CHECK (gender IN ('male', 'female', 'rather_not_say')),
  residence_status   TEXT CHECK (residence_status IN ('residence', 'commuter')),
  gender_filter_mode TEXT NOT NULL DEFAULT 'everyone' CHECK (gender_filter_mode IN ('everyone', 'same_gender')),
  profile_complete   INTEGER NOT NULL DEFAULT 0,
  is_seed            INTEGER NOT NULL DEFAULT 0,
  demo_simulated     INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_phone_hash ON users(phone_hash);

CREATE TABLE IF NOT EXISTS photos (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
  UNIQUE (user_id, position)
);

CREATE TABLE IF NOT EXISTS interest_tags (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  emoji    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES interest_tags(id),
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_custom_tags (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  text    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  id   INTEGER PRIMARY KEY,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_prompts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id   INTEGER NOT NULL REFERENCES prompts(id),
  answer_text TEXT NOT NULL,
  image_url   TEXT,
  position    INTEGER NOT NULL CHECK (position BETWEEN 0 AND 2),
  UNIQUE (user_id, position)
);

CREATE TABLE IF NOT EXISTS swipes (
  id         TEXT PRIMARY KEY,
  swiper_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swipee_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction  TEXT NOT NULL CHECK (direction IN ('pass', 'friend')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS swipes_pair ON swipes(swiper_id, swipee_id, direction);

CREATE TABLE IF NOT EXISTS pass_states (
  swiper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swipee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state     TEXT NOT NULL CHECK (state IN ('cooldown_pending', 'permanently_excluded')),
  passed_at INTEGER NOT NULL,
  PRIMARY KEY (swiper_id, swipee_id)
);

-- user_a_id < user_b_id is enforced in code so each pair has one row.
CREATE TABLE IF NOT EXISTS matches (
  id                TEXT PRIMARY KEY,
  user_a_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source            TEXT NOT NULL CHECK (source IN ('swipe', 'comment')),
  source_comment_id TEXT,
  created_at        INTEGER NOT NULL,
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id             TEXT PRIMARY KEY,
  author_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type    TEXT NOT NULL CHECK (target_type IN ('photo', 'prompt', 'custom_tag')),
  target_id      TEXT NOT NULL,
  text           TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  is_read        INTEGER NOT NULL DEFAULT 0,
  dismissed_at   INTEGER,   -- dismissed silently; the author is never told
  replied_at     INTEGER
);
CREATE INDEX IF NOT EXISTS comments_target ON comments(target_user_id, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_match ON messages(match_id, created_at);

CREATE TABLE IF NOT EXISTS phone_blocks (
  blocker_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_phone_hash TEXT NOT NULL,
  created_at         INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_phone_hash)
);
`;
