-- Paywall funnel events (Neon Postgres)
-- Run once in the Neon SQL editor or: psql $POSTGRES_URL -f scripts/neon-paywall-events-table.sql
--
-- event values: paywall_paid | paywall_rejected

CREATE TABLE IF NOT EXISTS paywall_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(32) NOT NULL,
  session_id VARCHAR(64),
  submitted_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_time ON paywall_events (submitted_at DESC);
