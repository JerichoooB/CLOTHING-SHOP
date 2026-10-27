CREATE TABLE IF NOT EXISTS password_reset_tokens (
 token_hash char(64) PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS password_reset_limits (
 key_hash char(64) PRIMARY KEY,
 window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL CHECK(attempts>0)
);
