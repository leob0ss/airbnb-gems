# Airbnb Gems

In 2025, Airbnb quietly hid unique categories from its app. This tool brings them back.

- **`/`** — V2 category searcher (pick vibes → place/dates → open Airbnb)
- **`/v1`** — Original curated US catalog (treehouses + A-frames)

We don't host bookings; searches and listing cards open official Airbnb pages.

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
5. Optional: `VITE_POSTHOG_PROJECT_TOKEN` (+ `VITE_POSTHOG_HOST`) for product analytics. Visitors are identified by the same `visitor_id` stored in the browser, so Person → Activity in PostHog shows their event stream.

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
