-- Convert legacy UTC timestamptz submitted_at columns to Pacific wall clock.
-- Safe to run once in Neon SQL editor. Skips tables already migrated.
-- Also applied automatically on the next API request after deploy.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'paywall_events'
      AND column_name = 'submitted_at'
      AND udt_name = 'timestamptz'
  ) THEN
    ALTER TABLE paywall_events
      ALTER COLUMN submitted_at TYPE TIMESTAMP
      USING submitted_at AT TIME ZONE 'America/Los_Angeles';
    ALTER TABLE paywall_events
      ALTER COLUMN submitted_at SET DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_submissions'
      AND column_name = 'submitted_at'
      AND udt_name = 'timestamptz'
  ) THEN
    ALTER TABLE contact_submissions
      ALTER COLUMN submitted_at TYPE TIMESTAMP
      USING submitted_at AT TIME ZONE 'America/Los_Angeles';
    ALTER TABLE contact_submissions
      ALTER COLUMN submitted_at SET DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'filter_requests'
      AND column_name = 'submitted_at'
      AND udt_name = 'timestamptz'
  ) THEN
    ALTER TABLE filter_requests
      ALTER COLUMN submitted_at TYPE TIMESTAMP
      USING submitted_at AT TIME ZONE 'America/Los_Angeles';
    ALTER TABLE filter_requests
      ALTER COLUMN submitted_at SET DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'survey_responses'
      AND column_name = 'submitted_at'
      AND udt_name = 'timestamptz'
  ) THEN
    ALTER TABLE survey_responses
      ALTER COLUMN submitted_at TYPE TIMESTAMP
      USING submitted_at AT TIME ZONE 'America/Los_Angeles';
    ALTER TABLE survey_responses
      ALTER COLUMN submitted_at SET DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles');
  END IF;
END $$;
