import type { NeonQueryFunction } from "@neondatabase/serverless";

export const PACIFIC_TIMEZONE = "America/Los_Angeles";

type Sql = NeonQueryFunction<false, false>;

type SubmittedAtTable =
  | "paywall_events"
  | "contact_submissions"
  | "filter_requests"
  | "survey_responses";

/** One-time migration: convert legacy UTC timestamptz columns to Pacific wall clock. */
export async function migrateSubmittedAtToPacific(
  sql: Sql,
  table: SubmittedAtTable,
): Promise<void> {
  switch (table) {
    case "paywall_events":
      await sql`
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
      `;
      break;
    case "contact_submissions":
      await sql`
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
      `;
      break;
    case "filter_requests":
      await sql`
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
      `;
      break;
    case "survey_responses":
      await sql`
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
      `;
      break;
  }
}

export function formatPacificTimestamp(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(date);
}
