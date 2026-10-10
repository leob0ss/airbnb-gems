import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../_core/env.js";
import { captureServerEvent } from "../_core/posthog.js";
import { CATALOG, CATALOG_BY_KEY, CATALOG_KEYS } from "./catalog.js";

const MODEL = "claude-haiku-4-5";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Claude's answer; the schema below guarantees this shape. */
export type Interpretation = {
  place: string;
  checkin: string;
  checkout: string;
  flexibleLength: "none" | "weekend" | "week" | "month";
  flexibleMonths: string[];
  adults: number;
  children: number;
  pets: boolean;
  priceMaxPerNight: number;
  minBedrooms: number;
  wishes: Wish[];
  summary: string;
};

/** One thing the traveller asked for, and the filters chosen for it. */
export type Wish = {
  phrase: string;
  kind: "specific" | "vibe";
  filters: string[];
};

const chosenFilters = (r: Interpretation) =>
  Array.from(new Set(r.wishes.flatMap((w) => w.filters)));

const unmatchedWishes = (r: Interpretation) =>
  r.wishes.filter((w) => w.filters.length === 0).map((w) => w.phrase);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "place", "checkin", "checkout", "flexibleLength", "flexibleMonths",
    "adults", "children", "pets", "priceMaxPerNight", "minBedrooms",
    "wishes", "summary",
  ],
  properties: {
    place: { type: "string" },
    checkin: { type: "string" },
    checkout: { type: "string" },
    flexibleLength: { type: "string", enum: ["none", "weekend", "week", "month"] },
    flexibleMonths: { type: "array", items: { type: "string", enum: MONTHS } },
    adults: { type: "integer" },
    children: { type: "integer" },
    pets: { type: "boolean" },
    priceMaxPerNight: { type: "integer" },
    minBedrooms: { type: "integer" },
    filters: { type: "array", items: { type: "string", enum: CATALOG_KEYS } },
    unmatched: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

function systemPrompt(today: string): string {
  const catalog = CATALOG.map(
    (f) => `- ${f.key}: ${f.label}${f.hint ? ` (${f.hint})` : ""}`,
  ).join("\n");

  return `You turn a traveller's description of the Airbnb stay they want into Airbnb search filters.

Today is ${today}.

Rules:
- Only use filters the traveller asked for or clearly implied. Every filter removes listings, so most searches need 0-4.
- place: a searchable place name like "Asheville, NC" or "Yosemite National Park", or "" if none.
- Exact dates go in checkin/checkout as YYYY-MM-DD. Vague timing like "a weekend in October" uses flexibleLength + flexibleMonths instead. flexibleLength is the trip length: "month" only for month-long stays; if only a month is named ("in December"), use "week". Otherwise leave dates "" and flexibleLength "none".
- A couple or romantic trip means 2 adults. pets is true for dog-friendly or travelling with a pet.
- priceMaxPerNight is USD per night, 0 for no limit. minBedrooms is 0 unless stated or implied by group size.
- Several property types can be picked together; Airbnb shows any of them.
- unmatched: short phrases for wishes that neither a field above nor a filter captures, e.g. "near hiking trails", "great view". Don't list anything you already set, and never pretend a filter covers a wish.
- summary: one short, friendly sentence describing the search.

Filters:
${catalog}`;
}

async function interpret(query: string): Promise<Interpretation> {
  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt(today),
    messages: [{ role: "user", content: query }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  const block = message.content[0];
  if (block?.type !== "text") throw new Error("Claude returned no text");
  return JSON.parse(block.text);
}

/** Airbnb's default night count for undated price filters. */
const DEFAULT_NIGHTS = 5;
const FLEXIBLE = {
  weekend: { param: "weekend_trip", nights: 2 },
  week: { param: "one_week", nights: 7 },
  month: { param: "one_month", nights: 30 },
};

export function buildSearchUrl(r: Interpretation): string {
  const qs = new URLSearchParams();
  qs.append("refinement_paths[]", "/homes");
  qs.set("search_mode", "regular_search");
  if (r.place) qs.set("query", r.place);

  let nights = DEFAULT_NIGHTS;
  const stay = (Date.parse(r.checkout) - Date.parse(r.checkin)) / 86_400_000;
  if (stay > 0) {
    qs.set("checkin", r.checkin);
    qs.set("checkout", r.checkout);
    nights = Math.round(stay);
  } else if (r.flexibleLength !== "none") {
    const flex = FLEXIBLE[r.flexibleLength];
    qs.set("date_picker_type", "flexible_dates");
    qs.append("flexible_trip_lengths[]", flex.param);
    for (const month of r.flexibleMonths) qs.append("flexible_trip_dates[]", month);
    nights = flex.nights;
  }

  if (r.adults > 0) qs.set("adults", String(r.adults));
  if (r.children > 0) qs.set("children", String(r.children));
  if (r.pets) qs.set("pets", "1");

  if (r.priceMaxPerNight > 0) {
    // Airbnb's price_max is a trip total, not a nightly rate.
    qs.set("price_filter_input_type", "0");
    qs.set("price_filter_num_nights", String(nights));
    qs.set("price_max", String(r.priceMaxPerNight * nights));
  }
  if (r.minBedrooms > 0) qs.set("min_bedrooms", String(r.minBedrooms));

  for (const key of Array.from(new Set(r.filters))) {
    for (const [name, value] of CATALOG_BY_KEY.get(key)?.params ?? []) {
      qs.append(name, value);
    }
  }

  // Otherwise Airbnb reads price_max in the visitor's local currency.
  qs.set("currency", "USD");
  return `https://www.airbnb.com/s/homes?${qs.toString()}`;
}

export async function handleDescribeRequest(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    query?: unknown;
    visitorId?: unknown;
  };
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 500) : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : null;
  if (!query) {
    return Response.json({ success: false, error: "Describe your stay." }, { status: 400 });
  }
  if (!ENV.anthropicApiKey) {
    return Response.json({ success: false, error: "Not configured." }, { status: 503 });
  }

  try {
    const result = await interpret(query);
    const url = buildSearchUrl(result);
    captureServerEvent("describe_search_interpreted", visitorId, {
      query,
      summary: result.summary,
      filters: result.filters.join(","),
      unmatched: result.unmatched.join(" | "),
      url,
    });
    return Response.json({ success: true, url });
  } catch (error) {
    console.error("[Describe] failed:", error);
    return Response.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
