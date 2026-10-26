-- PROPOSTA DE ESQUEMA: migração ainda não aplicada por um servidor.
-- Destino: SQLite, com execução de PRAGMA foreign_keys = ON em cada conexão.
-- Não contém dados pessoais nem credenciais reais.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS school_classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  year_label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  class_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE RESTRICT,
  CHECK ((role = 'student' AND class_id IS NOT NULL) OR role = 'admin')
);

CREATE TABLE IF NOT EXISTS modalities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  score_label TEXT NOT NULL DEFAULT 'pontos',
  points_win INTEGER NOT NULL DEFAULT 3 CHECK (points_win >= 0),
  points_draw INTEGER NOT NULL DEFAULT 1 CHECK (points_draw >= 0),
  points_loss INTEGER NOT NULL DEFAULT 0 CHECK (points_loss >= 0),
  tie_breakers_json TEXT NOT NULL DEFAULT '["points","wins","score_difference","scores_for"]'
    CHECK (json_valid(tie_breakers_json)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE,
  class_id INTEGER NOT NULL,
  modality_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (class_id, modality_id),
  UNIQUE (id, modality_id),
  FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (modality_id) REFERENCES modalities(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  shirt_number INTEGER CHECK (shirt_number IS NULL OR shirt_number BETWEEN 0 AND 999),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (team_id, name),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  modality_id INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 1 AND 360),
  venue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (home_team_id <> away_team_id),
  UNIQUE (id, modality_id),
  FOREIGN KEY (modality_id) REFERENCES modalities(id) ON DELETE RESTRICT,
  FOREIGN KEY (home_team_id, modality_id) REFERENCES teams(id, modality_id) ON DELETE RESTRICT,
  FOREIGN KEY (away_team_id, modality_id) REFERENCES teams(id, modality_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Evita duas partidas no mesmo local e horário inicial; sobreposição por duração
-- deverá ser validada também pela aplicação antes da inserção/atualização.
CREATE UNIQUE INDEX IF NOT EXISTS matches_venue_start_unique
  ON matches (venue COLLATE NOCASE, starts_at)
  WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS matches_schedule_idx ON matches (starts_at, status);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY,
  match_id INTEGER NOT NULL UNIQUE,
  home_score INTEGER NOT NULL CHECK (home_score BETWEEN 0 AND 999),
  away_score INTEGER NOT NULL CHECK (away_score BETWEEN 0 AND 999),
  updated_by INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE RESTRICT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
  published_at TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS news_publication_idx ON news (status, published_at DESC);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  caption TEXT NOT NULL CHECK (length(trim(caption)) BETWEEN 1 AND 160),
  alt_text TEXT NOT NULL CHECK (length(trim(alt_text)) BETWEEN 1 AND 200),
  consent_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (consent_confirmed IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  uploaded_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  category TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY,
  poll_id INTEGER NOT NULL,
  athlete_id INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (poll_id, athlete_id),
  UNIQUE (id, poll_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE RESTRICT,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY,
  poll_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (poll_id, student_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE RESTRICT,
  FOREIGN KEY (candidate_id, poll_id) REFERENCES candidates(id, poll_id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS votes_poll_candidate_idx ON votes (poll_id, candidate_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);
