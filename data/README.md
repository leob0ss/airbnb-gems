# Data pipeline

The canonical listing dataset is **`listings-export.csv`** (~1,195 rows).

## Update listings (normal workflow)

```bash
pnpm data:json
git add data/listings-export.csv client/public/listings.json
git commit -m "Update listings"
git push
```

## Optional: scrape new candidates from Airbnb

Use `scrape-state-generic.mjs` to discover listings, then merge into the CSV manually:

1. Update `SESSION_COOKIE` in `scrape-state-generic.mjs` (copy from browser DevTools).
2. Run:

   ```bash
   node data/scrape-state-generic.mjs --state Oregon --keyword treehouse
   node data/scrape-state-generic.mjs --state Colorado --keyword a-frame
   ```

   Output: `/tmp/{state}-{keyword}-*.txt`

3. Add chosen rows to `listings-export.csv`, then run `pnpm data:json`.

## Refresh ratings & review counts (existing CSV)

Fetches current stats from each listing's Airbnb page (~0.75s per row):

```bash
pnpm data:enrich              # rows missing reviewCount
pnpm data:enrich -- --limit 20   # test batch
pnpm data:json
```

Use `--force` to refresh all rows. Counts reflect when you run the script, not live Airbnb.
