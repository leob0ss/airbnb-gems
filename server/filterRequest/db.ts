import { neon } from "@neondatabase/serverless";
import { migrateSubmittedAtToPacific } from "../_core/pacificTime.js";

let schemaReady: Promise<void> | null = null;

function getPostgresUrl(): string | null {
  return (
    process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? null
  );
}

export function isFilterRequestDbConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

async function ensureSchemaOnce(): Promise<void> {
  const url = getPostgresUrl();
  if (!url) return;

  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = neon(url);
      await sql`
        CREATE TABLE IF NOT EXISTS filter_requests (
          id SERIAL PRIMARY KEY,
          what_looking_for TEXT NOT NULL,
          email VARCHAR(320),
          session_id VARCHAR(64),
          submitted_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')
        )
      `;
      await migrateSubmittedAtToPacific(sql, "filter_requests");
      await sql`
        CREATE INDEX IF NOT EXISTS idx_filter_requests_time
        ON filter_requests (submitted_at DESC)
      `;
    })();
  }

  await schemaReady;
}

export async function insertFilterRequest(
  whatLookingFor: string,
  email: string | null,
  sessionId: string | null,
): Promise<number> {
  const url = getPostgresUrl();
  if (!url) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = neon(url);
  await ensureSchemaOnce();

  const rows = await sql`
    INSERT INTO filter_requests (what_looking_for, email, session_id)
    VALUES (${whatLookingFor}, ${email}, ${sessionId})
    RETURNING id
  `;

  return Number(rows[0]?.id ?? 0);
}
