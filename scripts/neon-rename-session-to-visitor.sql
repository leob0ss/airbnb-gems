-- One-time: rename legacy session_id → visitor_id on existing Neon tables.
-- App boot also runs this automatically; use this only if you prefer manual SQL.
-- Safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'paywall_events' AND column_name = 'session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'paywall_events' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE paywall_events RENAME COLUMN session_id TO visitor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'filter_requests' AND column_name = 'session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'filter_requests' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE filter_requests RENAME COLUMN session_id TO visitor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE survey_responses RENAME COLUMN session_id TO visitor_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paywall_events_visitor ON paywall_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_filter_requests_visitor ON filter_requests (visitor_id);
CREATE INDEX IF NOT EXISTS idx_survey_visitor ON survey_responses (visitor_id);
