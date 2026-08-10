#!/usr/bin/env node
/**
 * Create (and optionally launch) PostHog's "Open feedback" template survey.
 *
 * Once launched, posthog-js on the site shows the popover automatically when
 * display conditions match — no extra frontend UI required.
 *
 * Requires in .env (never commit these):
 *   POSTHOG_PERSONAL_API_KEY=phx_...   # User → API keys, scope survey:write
 *   POSTHOG_PROJECT_ID=516038
 *   POSTHOG_API_HOST=https://us.posthog.com
 *
 * Usage:
 *   pnpm posthog:survey:open-feedback           # create draft
 *   pnpm posthog:survey:open-feedback -- --launch
 *   pnpm posthog:survey:open-feedback -- --launch --force
 */
import "dotenv/config";

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const API_HOST = (
  process.env.POSTHOG_API_HOST || "https://us.posthog.com"
).replace(/\/$/, "");

const SURVEY_NAME = "Open feedback";
const args = new Set(process.argv.slice(2));
const shouldLaunch = args.has("--launch");
const force = args.has("--force");

/** Mirrors PostHog's built-in "Open feedback" survey template. */
const OPEN_FEEDBACK_TEMPLATE = {
  name: SURVEY_NAME,
  description: "Let your users share what's on their mind.",
  type: "popover",
  questions: [
    {
      type: "open",
      question: "What can we do to improve our product?",
      description: "",
      descriptionContentType: "text",
    },
  ],
  appearance: {
    backgroundColor: "#eeeded",
    submitButtonColor: "black",
    submitButtonTextColor: "white",
    ratingButtonColor: "white",
    ratingButtonActiveColor: "black",
    borderColor: "#c9c6c6",
    placeholder: "Start typing...",
    whiteLabel: false,
    displayThankYouMessage: true,
    thankYouMessageHeader: "Thank you for your feedback!",
    position: "right",
    // Brief delay so the Airbnb tab can open first after search.
    surveyPopupDelaySeconds: 2,
  },
  // Show once after a user opens an Airbnb search from the V2 homepage.
  conditions: {
    events: {
      repeatedActivation: false,
      values: [{ name: "airbnb_search_opened" }],
    },
    seenSurveyWaitPeriodInDays: 14,
  },
};

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

async function findExistingByName() {
  const list = await api(`/api/projects/${PROJECT_ID}/surveys/?limit=100`);
  const results = list.results || [];
  return results.find(
    (s) => s.name === SURVEY_NAME && !s.archived && s.end_date == null,
  );
}

async function main() {
  if (!API_KEY || !PROJECT_ID) {
    console.error(
      "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in .env",
    );
    console.error(
      "Create a personal API key with survey:write at https://us.posthog.com/settings/user-api-keys",
    );
    process.exit(1);
  }

  const existing = await findExistingByName();
  if (existing && !force) {
    console.log(
      JSON.stringify(
        {
          status: "exists",
          id: existing.id,
          name: existing.name,
          start_date: existing.start_date,
          url: `${API_HOST}/surveys/${existing.id}`,
          hint: "Pass --force to create another copy, or --launch to launch this draft.",
        },
        null,
        2,
      ),
    );

    if (shouldLaunch && !existing.start_date) {
      const launched = await api(
        `/api/projects/${PROJECT_ID}/surveys/${existing.id}/`,
        {
          method: "PATCH",
          body: { start_date: new Date().toISOString() },
        },
      );
      console.log(
        JSON.stringify(
          {
            status: "launched",
            id: launched.id,
            start_date: launched.start_date,
            url: `${API_HOST}/surveys/${launched.id}`,
          },
          null,
          2,
        ),
      );
    }
    return;
  }

  const payload = {
    ...OPEN_FEEDBACK_TEMPLATE,
    ...(shouldLaunch ? { start_date: new Date().toISOString() } : {}),
  };

  const created = await api(`/api/projects/${PROJECT_ID}/surveys/`, {
    method: "POST",
    body: payload,
  });

  console.log(
    JSON.stringify(
      {
        status: shouldLaunch ? "created_and_launched" : "created_draft",
        id: created.id,
        name: created.name,
        start_date: created.start_date,
        url: `${API_HOST}/surveys/${created.id}`,
        next: shouldLaunch
          ? "Visit the site, complete a search (airbnb_search_opened), and the popover should appear."
          : "Review in PostHog, then re-run with --launch or click Launch in the UI.",
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
