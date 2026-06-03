# Airbnb Gems

Browse Airbnb listings by architectural category — treehouses, A-frames, and more — using filters Airbnb removed from its main navigation. Each card links directly to the official Airbnb listing. We curate and filter only; we don't host bookings.

**~1,195 listings** across the United States (treehouses + A-frames).

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui |
| API | tRPC 11, Express (local dev) |
| Database | MySQL, Drizzle ORM |
| Deploy | Vercel (static UI + serverless API) |

## Quick start (local)

**Requirements:** Node 22+, pnpm, MySQL

```bash
pnpm install
cp .env.example .env

# Start MySQL (pick one):
brew services start mysql
# or: docker compose up -d

mysql -u root -e "CREATE DATABASE IF NOT EXISTS airbnb_gems;"
pnpm db:migrate
pnpm db:import

pnpm dev
# → http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com).
2. Set environment variables (Project → Settings → Environment Variables):

   | Variable | Required | Notes |
   |---|---|---|
   | `DATABASE_URL` | Yes | Hosted MySQL (Railway, TiDB Cloud, etc.) |
   | `VITE_GOOGLE_MAPS_API_KEY` | No | Desktop map view |
   | `NOTIFY_EMAIL` | No | Owner notifications |
   | `RESEND_API_KEY` | No | Email delivery via [Resend](https://resend.com) |
   | `RESEND_FROM` | No | Sender address for Resend |

3. After the first deploy, seed production from your machine:

   ```bash
   DATABASE_URL="mysql://..." pnpm db:migrate
   DATABASE_URL="mysql://..." pnpm db:import
   ```

The listing dataset is included at `data/listings-export.csv` (1,195 rows).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Local dev server (Express + Vite) |
| `pnpm build` | Production frontend build |
| `pnpm test` | Run Vitest tests |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:import` | Import `data/listings-export.csv` into MySQL |

## Data pipeline

To scrape new listings from Airbnb (requires a valid session cookie in the scraper):

```bash
node data/scrape-state-generic.mjs --state Oregon --keyword treehouse
DATABASE_URL=... node data/seed-new-states.mjs
```

See `data/README.md` for details.

## Project structure

```
├── api/trpc/          # Vercel serverless tRPC handler
├── client/src/        # React frontend (single-page app)
├── server/            # tRPC routers, DB helpers, scraper
├── drizzle/           # Database schema + migrations
├── data/              # Listings export + scrape/seed scripts
└── scripts/           # Migration helper
```

## Disclaimer

Airbnb Gems is not affiliated with or endorsed by Airbnb, Inc. All listings link to official Airbnb pages.

## License

MIT
