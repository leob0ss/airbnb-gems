# Data pipeline

The canonical listing dataset lives in **`listings-export.csv`** (~1,195 rows). Import it with:

```bash
pnpm db:import
```

## Refresh listings from Airbnb

1. Update `SESSION_COOKIE` in `scrape-state-generic.mjs` (copy from browser DevTools).
2. Scrape a state + keyword:

   ```bash
   node data/scrape-state-generic.mjs --state Oregon --keyword treehouse
   node data/scrape-state-generic.mjs --state Colorado --keyword a-frame
   ```

   Output: `/tmp/{state}-{keyword}-highs.json`

3. Seed into the database:

   ```bash
   # Edit COMBOS in seed-new-states.mjs, then:
   DATABASE_URL=... node data/seed-new-states.mjs
   ```

## Bulk scrape (all states)

```bash
DATABASE_URL=... node data/scrape-all-states.mjs
```

Runs scrapers in parallel and seeds results directly.

## Scoring

Each listing is scored HIGH / MEDIUM / LOW. Only HIGH listings are kept (name match, property type match, or LLM fallback via `BUILT_IN_FORGE_API_*` env vars when running scrapers locally).
