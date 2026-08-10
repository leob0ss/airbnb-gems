#!/usr/bin/env node
/**
 * Find / launch the PostHog NPS survey already created in the project.
 *
 * Expected name prefix (PostHog template default):
 *   "Net promoter score (NPS)"
 * e.g. "Net promoter score (NPS) (2026-08-10 08:49)"
 *
 * With posthog-js on the site (surveys enabled), a launched popover survey
 * shows automatically when its display conditions match — no extra UI needed.
 *
 * Requires in .env (never commit these):
 *   POSTHOG_PERSONAL_API_KEY=phx_...   # survey:read (+ survey:write to patch/launch)
 *   POSTHOG_PROJECT_ID=516038
 *   POSTHOG_API_HOST=https://us.posthog.com
 *
 * Usage:
 *   pnpm posthog:survey:nps
 *   pnpm posthog:survey:nps -- --launch
 *   pnpm posthog:survey:nps -- --set-search-trigger
 *   pnpm posthog:survey:nps -- --launch --set-search-trigger
 */
import "dotenv/config";

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const API_HOST = (
  process.env.POSTHOG_API_HOST || "https://us.posthog.com"
).replace(/\/$/, "");

const NAME_PREFIX = "Net promoter score (NPS)";
const args = new Set(process.argv.slice(2));
const shouldLaunch = args.has("--launch");
const setSearchTrigger = args.has("--set-search-trigger");

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `PostHog ${method} ${path} → ${res.status}: ${JSON.stringify(data, null, 2)}`,
    );
  }
  return data;
}

async function findNpsSurvey() {
  const list = await api(`/api/projects/${PROJECT_ID}/surveys/?limit=100`);
  const results = (list.results || []).filter(
    (s) =>
      typeof s.name === "string" &&
      s.name.startsWith(NAME_PREFIX) &&
      !s.archived,
  );
  // Prefer active (no end_date), then most recently created.
  results.sort((a, b) => {
    const aEnded = a.end_date ? 1 : 0;
    const bEnded = b.end_date ? 1 : 0;
    if (aEnded !== bEnded) return aEnded - bEnded;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  return results[0] || null;
}

async function main() {
  if (!API_KEY || !PROJECT_ID) {
    console.error(
      "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in .env",
    );
    console.error(
      "Create a personal API key at https://us.posthog.com/settings/user-api-keys",
    );
    process.exit(1);
  }

  const survey = await findNpsSurvey();
  if (!survey) {
    console.error(
      `No survey found whose name starts with "${NAME_PREFIX}". Create the NPS template in PostHog first.`,
    );
    process.exit(1);
  }

  const patch = {};
  if (shouldLaunch && !survey.start_date) {
    patch.start_date = new Date().toISOString();
  }
  if (setSearchTrigger) {
    patch.conditions = {
      ...(survey.conditions || {}),
      events: {
        repeatedActivation: false,
        values: [{ name: "airbnb_search_opened" }],
      },
      seenSurveyWaitPeriodInDays:
        survey.conditions?.seenSurveyWaitPeriodInDays ?? 14,
    };
    // Brief delay so the Airbnb tab can open first after search.
    patch.appearance = {
      ...(survey.appearance || {}),
      surveyPopupDelaySeconds:
        survey.appearance?.surveyPopupDelaySeconds ?? 2,
    };
  }

  let updated = survey;
  if (Object.keys(patch).length > 0) {
    updated = await api(`/api/projects/${PROJECT_ID}/surveys/${survey.id}/`, {
      method: "PATCH",
      body: patch,
    });
  }

  console.log(
    JSON.stringify(
      {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        start_date: updated.start_date,
        end_date: updated.end_date,
        conditions: updated.conditions,
        url: `${API_HOST}/surveys/${updated.id}`,
        status: updated.start_date
          ? "launched — popover will show when display conditions match"
          : "draft — click Launch in PostHog or re-run with --launch",
        site: "No frontend change needed; posthog-js already has surveys enabled.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
