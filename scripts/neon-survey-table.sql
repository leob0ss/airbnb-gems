-- PMF survey responses (Neon Postgres)
-- Run once in the Neon SQL editor or: psql $POSTGRES_URL -f scripts/neon-survey-table.sql

CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  answer VARCHAR(3) NOT NULL CHECK (answer IN ('yes', 'no')),
  followup TEXT,
  session_id VARCHAR(64),
  active_category VARCHAR(64),
  active_state VARCHAR(128),
  submitted_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')
);

CREATE INDEX IF NOT EXISTS idx_survey_answer ON survey_responses (answer);
CREATE INDEX IF NOT EXISTS idx_survey_time ON survey_responses (submitted_at DESC);
