-- Filter requests from "Missing your filter?" (Neon Postgres)
-- Run once in the Neon SQL editor or: psql $POSTGRES_URL -f scripts/neon-filter-request-table.sql

CREATE TABLE IF NOT EXISTS filter_requests (
  id SERIAL PRIMARY KEY,
  what_looking_for TEXT NOT NULL,
  email VARCHAR(320),
  session_id VARCHAR(64),
  submitted_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')
);

CREATE INDEX IF NOT EXISTS idx_filter_requests_time ON filter_requests (submitted_at DESC);
