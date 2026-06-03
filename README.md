# Airbnb Gems

Browse Airbnb listings by architectural category — treehouses, A-frames, and more — using filters Airbnb removed from its main navigation. Each card links directly to the official Airbnb listing. We curate and filter only; we don't host bookings.

**~1,195 listings** across the United States (treehouses + A-frames).

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui |
| Listings data | Static JSON (`client/public/listings.json`) |
| Deploy | Vercel (static site) |
| Optional backend | tRPC + MySQL (local dev only, for future use) |

Listings are served from a static JSON file — no database required in production.

## Quick start (local)

```bash
pnpm install
pnpm data:json   # CSV → listings.json (already committed; re-run after CSV updates)
pnpm dev
# → http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub — Vercel redeploys automatically.
2. No `DATABASE_URL` or backend setup needed for listings.
3. Optional: set `VITE_GOOGLE_MAPS_API_KEY` for the desktop map view.

## Updating listings

1. Edit `data/listings-export.csv` (or replace it with a new export).
2. Regenerate JSON and deploy:

   ```bash
   pnpm data:json
   git add data/listings-export.csv client/public/listings.json
   git commit -m "Update listings"
   git push
   ```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm data:json` | Convert CSV → `client/public/listings.json` |
| `pnpm build` | Regenerate JSON + build for Vercel |
| `pnpm test` | Run Vitest tests |

## Optional: local MySQL

The tRPC backend and import scripts still exist if you want a database locally:

```bash
cp .env.example .env
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS airbnb_gems;"
pnpm db:migrate && pnpm db:import
```

This is not used by the Vercel deployment.

## Project structure

```
├── client/public/listings.json   # Listing data served to the browser
├── data/listings-export.csv      # Source of truth for listings
├── scripts/csv-to-json.mjs       # CSV → JSON converter
├── client/src/                   # React frontend
└── server/                       # Legacy tRPC backend (local dev)
```

## Disclaimer

Airbnb Gems is not affiliated with or endorsed by Airbnb, Inc. All listings link to official Airbnb pages.

## License

MIT
