import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | null = null;

function getPostgresUrl(): string | null {
  return process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? null;
}

export function isPaywallDbConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

async function ensureSchemaOnce(): Promise<void> {
  const url = getPostgresUrl();
  if (!url) return;

  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = neon(url);
      await sql`
        CREATE TABLE IF NOT EXISTS paywall_events (
          id SERIAL PRIMARY KEY,
          event VARCHAR(32) NOT NULL,
          session_id VARCHAR(64),
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_paywall_events_time
        ON paywall_events (submitted_at DESC)
      `;
    })();
  }

  await schemaReady;
}

export async function insertPaywallEvent(
  event: string,
  sessionId: string | null
): Promise<number> {
  const url = getPostgresUrl();
  if (!url) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = neon(url);
  await ensureSchemaOnce();

  const rows = await sql`
    INSERT INTO paywall_events (event, session_id)
    VALUES (${event}, ${sessionId})
    RETURNING id
  `;

  return Number(rows[0]?.id ?? 0);
}
