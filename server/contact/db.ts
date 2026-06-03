import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | null = null;

function getPostgresUrl(): string | null {
  return process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? null;
}

export function isContactDbConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

async function ensureSchemaOnce(): Promise<void> {
  const url = getPostgresUrl();
  if (!url) return;

  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = neon(url);
      await sql`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          message TEXT NOT NULL,
          email VARCHAR(320),
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_contact_submissions_time
        ON contact_submissions (submitted_at DESC)
      `;
    })();
  }

  await schemaReady;
}

export async function insertContactSubmission(
  message: string,
  email: string | null
): Promise<number> {
  const url = getPostgresUrl();
  if (!url) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = neon(url);
  await ensureSchemaOnce();

  const rows = await sql`
    INSERT INTO contact_submissions (message, email)
    VALUES (${message}, ${email})
    RETURNING id
  `;

  return Number(rows[0]?.id ?? 0);
}
