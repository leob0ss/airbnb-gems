-- Contact form submissions (Neon Postgres)
-- Run once in the Neon SQL editor or: psql $POSTGRES_URL -f scripts/neon-contact-table.sql

CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  email VARCHAR(320),
  submitted_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_time ON contact_submissions (submitted_at DESC);
