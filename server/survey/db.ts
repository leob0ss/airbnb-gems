import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | null = null;

function getPostgresUrl(): string | null {
  return (
    process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? null
  );
}

export function isSurveyDbConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

async function ensureSchemaOnce(): Promise<void> {
  const url = getPostgresUrl();
  if (!url) return;

  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = neon(url);
      await sql`
        CREATE TABLE IF NOT EXISTS survey_responses (
          id SERIAL PRIMARY KEY,
          answer VARCHAR(3) NOT NULL CHECK (answer IN ('yes', 'no')),
          followup TEXT,
          session_id VARCHAR(64),
          active_category VARCHAR(64),
          active_state VARCHAR(128),
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_survey_answer
        ON survey_responses (answer)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_survey_time
        ON survey_responses (submitted_at DESC)
      `;
    })();
  }

  await schemaReady;
}

export async function insertSurveyResponse(
  answer: "yes" | "no",
  followup: string | null,
  sessionId: string | null,
  activeCategory: string | null,
  activeState: string | null,
): Promise<number> {
  const url = getPostgresUrl();
  if (!url) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = neon(url);
  await ensureSchemaOnce();

  const rows = await sql`
    INSERT INTO survey_responses (answer, followup, session_id, active_category, active_state)
    VALUES (${answer}, ${followup}, ${sessionId}, ${activeCategory}, ${activeState})
    RETURNING id
  `;

  return Number(rows[0]?.id ?? 0);
}
