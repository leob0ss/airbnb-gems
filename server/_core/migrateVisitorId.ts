import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

type VisitorIdTable =
  | "paywall_events"
  | "filter_requests"
  | "survey_responses";

/**
 * Ensure visitor_id exists: rename legacy session_id when present, else add the column.
 * Safe to run on every boot.
 */
export async function migrateSessionIdToVisitorId(
  sql: Sql,
  table: VisitorIdTable,
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
              AND column_name = 'session_id'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'paywall_events'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE paywall_events RENAME COLUMN session_id TO visitor_id;
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'paywall_events'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE paywall_events ADD COLUMN visitor_id VARCHAR(64);
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
              AND column_name = 'session_id'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'filter_requests'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE filter_requests RENAME COLUMN session_id TO visitor_id;
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'filter_requests'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE filter_requests ADD COLUMN visitor_id VARCHAR(64);
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
              AND column_name = 'session_id'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'survey_responses'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE survey_responses RENAME COLUMN session_id TO visitor_id;
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'survey_responses'
              AND column_name = 'visitor_id'
          ) THEN
            ALTER TABLE survey_responses ADD COLUMN visitor_id VARCHAR(64);
          END IF;
        END $$;
      `;
      break;
  }
}
