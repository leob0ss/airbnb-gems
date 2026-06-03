# Airbnb Gems

Browse Airbnb listings by architectural category — treehouses, A-frames, and more — using filters Airbnb removed from its main navigation. Each card links directly to the official Airbnb listing. We curate and filter only; we don't host bookings.

**~1,195 listings** across the United States (treehouses + A-frames).

## Stack

| Layer     | Tech                                             |
| --------- | ------------------------------------------------ |
| Frontend  | React 19, Vite, Tailwind CSS 4, shadcn/ui        |
| Listings  | Static JSON (`client/public/listings.json`)      |
| Forms API | Vercel serverless → Neon Postgres + Resend email |
| Deploy    | Vercel                                           |

## Quick start (local)

```bash
pnpm install
cp .env.example .env   # add POSTGRES_URL for forms, optional maps key
pnpm data:json         # CSV → listings.json (already committed; re-run after CSV updates)
pnpm dev
# → http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub — Vercel redeploys automatically.
2. **Storage → Neon** (sets `POSTGRES_URL`).
3. **Resend** env vars: `NOTIFY_EMAIL`, `RESEND_API_KEY`, optional `RESEND_FROM`.
4. Optional: `VITE_GOOGLE_MAPS_API_KEY` for the desktop map view.

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

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Local dev (Vite + form API routes)          |
| `pnpm data:json` | Convert CSV → `client/public/listings.json` |
| `pnpm build`     | Regenerate JSON + build for Vercel          |
| `pnpm test`      | Run Vitest tests                            |

## Project structure

```
├── client/public/listings.json   # Listing data served to the browser
├── data/listings-export.csv      # Source of truth for listings
├── scripts/csv-to-json.mjs       # CSV → JSON converter
├── api/                          # Vercel serverless handlers
├── server/contact|filterRequest|survey/  # Form logic (Neon + Resend)
└── client/src/                   # React frontend
```

## Disclaimer

Airbnb Gems is not affiliated with or endorsed by Airbnb, Inc. All listings link to official Airbnb pages.
