/**
 * Apply all drizzle/*.sql migrations in order (local setup helper).
 * Usage: DATABASE_URL=... node scripts/apply-migrations.mjs
 */
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const drizzleDir = join(__dirname, "../drizzle");
const files = readdirSync(drizzleDir)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort();

const conn = await createConnection({ uri: DATABASE_URL, multipleStatements: true });

for (const file of files) {
  const raw = readFileSync(join(drizzleDir, file), "utf8");
  const statements = raw
    .split(/--> statement-breakpoint\n?/g)
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying ${file} (${statements.length} statements)...`);
  for (const sql of statements) {
    await conn.query(sql);
  }
}

await conn.end();
console.log(`Applied ${files.length} migration files.`);
