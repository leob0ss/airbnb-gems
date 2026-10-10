import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../_core/env.js";
import { captureServerEvent } from "../_core/posthog.js";
import { CATALOG, CATALOG_BY_KEY, CATALOG_KEYS, type CatalogFilter } from "./catalog.js";

const MODEL = "claude-sonnet-5-5";

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

/**
 * One thing the traveller asked for, and the filters it turned on with the
 * label or listed word each one matched. No matches means Airbnb can't filter it.
 */
export type Wish = {
  phrase: string;
  matches: { filter: string; word: string }[];
};

export const chosenFilters = (r: Interpretation) =>
  Array.from(new Set(r.wishes.flatMap((w) => w.matches.map((m) => m.filter))));

const unmatchedWishes = (r: Interpretation) =>
  r.wishes.filter((w) => w.matches.length === 0).map((w) => w.phrase);

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
    wishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phrase", "matches"],
        properties: {
          phrase: { type: "string" },
          matches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["filter", "word"],
              properties: {
                filter: { type: "string", enum: CATALOG_KEYS },
                word: { type: "string" },
              },
            },
          },
        },
      },
    },
    summary: { type: "string" },
  },
};

function describeFilter(f: CatalogFilter): string {
  const parts = [`- ${f.key}: ${f.label}`];
  if (f.hint) parts.push(`(${f.hint})`);
  if (f.exact?.length) parts.push(`| exact: ${f.exact.join(", ")}`);
  if (f.closeEnough?.length) parts.push(`| close enough: ${f.closeEnough.join(", ")}`);
  return parts.join(" ");
}

function systemPrompt(today: string): string {
  return `You turn a traveller's description of the Airbnb stay they want into Airbnb search filters.

Today is ${today}.

Fields:
- place: a searchable place name like "Asheville, NC" or "Yosemite National Park", or "" if none. If several places are named ("North Carolina or Virginia"), use one region that covers them ("Blue Ridge Mountains").
- Exact dates go in checkin/checkout as YYYY-MM-DD. Vague timing like "a weekend in October" uses flexibleLength + flexibleMonths instead. flexibleLength is the trip length: "month" only for month-long stays; if only a month is named ("in December"), use "week". Otherwise leave dates "" and flexibleLength "none".
- adults is the number of adults stated or implied (a couple or romantic trip means 2), otherwise 0. pets is true for dog-friendly or travelling with a pet.
- priceMaxPerNight is USD per night, 0 for no limit. "Affordable", "cheap" or "budget" without a number means 150.
- minBedrooms is 0 unless stated or implied by group size. "Big house" without a number means 4; that is all it sets.

Wishes and filters:
- wishes: split everything else the traveller wants into short phrases in their words. Skip anything a field above already covers (guests, pets, price, bedrooms, place, dates).
- Filters may list exact words (they name the thing) and close-enough phrases (they strongly imply it).
- A wish turns on a filter only when it means the same as that filter's label, one of its exact words or one of its close-enough phrases. Similar wording or another language counts; being merely related does not. A generic word like "games" doesn't match every filter whose label contains it.
- For each filter a wish turns on, give the label, exact word or close-enough phrase it matched in "word". If you can't name one from that filter's own entry, leave the filter out.
- One wish can turn on several filters, whatever their group, as long as each passes that check. A wish that matches nothing gets no matches.
- summary: one short, friendly sentence describing the search.

Filters:
${CATALOG.map(describeFilter).join("\n")}`;
}

export async function interpret(query: string): Promise<Interpretation> {
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
    max_tokens: 4096,
    system: systemPrompt(today),
    messages: [{ role: "user", content: query }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  const block = message.content.find((b) => b.type === "text");
  if (!block) throw new Error(`Claude returned no text (stop reason: ${message.stop_reason})`);
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

  for (const key of chosenFilters(r)) {
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
      filters: chosenFilters(result).join(","),
      unmatched: unmatchedWishes(result).join(" | "),
      wishes: result.wishes
        .map((w) => `${w.phrase} → ${w.matches.map((m) => `${m.filter} (${m.word})`).join(", ") || "none"}`)
        .join(" | "),
      url,
    });
    return Response.json({ success: true, url });
  } catch (error) {
    console.error("[Describe] failed:", error);
    return Response.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
