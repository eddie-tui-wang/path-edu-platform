CREATE TABLE IF NOT EXISTS institutions (
  id text PRIMARY KEY, name text NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, institution_id text NOT NULL REFERENCES institutions(id),
  username text NOT NULL UNIQUE, display_name text NOT NULL,
  password_hash text NOT NULL, roles jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT true,
  auth_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(roles) = 'array' AND jsonb_array_length(roles) > 0)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  auth_version integer NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS resource_grants (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  resource_type text NOT NULL CHECK (resource_type IN ('case','exam','standard_library','teacher_profile','student_profile')),
  resource_id text NOT NULL, permission text NOT NULL CHECK (permission IN ('read','manage')),
  purpose text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id, permission)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY, institution_id text NOT NULL REFERENCES institutions(id),
  actor_id text, target_id text, action text NOT NULL, detail jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS login_limits (
  key text PRIMARY KEY, failures integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(), blocked_until timestamptz
);
