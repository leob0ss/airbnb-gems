import { describe, expect, it } from "vitest";
import {
  detectCategories,
  extractListingData,
  matchPublicationsInText,
} from "./scraper/badgeExtractor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a PdpHighlight-style badge object inside minimal Airbnb HTML so that
 * extractListingData can parse it via extractNiobeData.
 */
function wrapInAirbnbHtml(pdpHighlights: object[]): string {
  const niobeData = {
    niobeMinimalClientData: [
      [
        "StayPdpCoreSectionsQuery",
        {
          data: {
            presentation: {
              stayProductDetailPage: {
                sections: {
                  sections: [
                    {
                      section: {
                        highlights: pdpHighlights,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    ],
  };

  return `<html><body>
    <script id="data-deferred-state-0">${JSON.stringify(niobeData)}</script>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("badge extraction — subtitleHtml.htmlText pattern", () => {
  it("extracts LISTING_DESIGN_PUBLICATIONS from subtitleHtml.htmlText", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Featured in",
        subtitle: null,
        subtitleHtml: { __typename: "Html", htmlText: "Dwell, October 2024" },
        icon: "SYSTEM_BOOK",
        learnMoreButton: null,
        type: "LISTING_DESIGN_PUBLICATIONS",
        highlightValue: null,
      },
    ]);

    const result = extractListingData(html);
    expect(result.badges).toBeDefined();
    expect(result.badges!.length).toBeGreaterThanOrEqual(1);

    const badge = result.badges!.find(
      (b) => b.badgeType === "LISTING_DESIGN_PUBLICATIONS",
    );
    expect(badge).toBeDefined();
    expect(badge!.value).toBe("Dwell, October 2024");
    expect(badge!.label).toBe("Featured in");
  });

  it("extracts LISTING_NOTABLE_DESIGNER from subtitleHtml.htmlText", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Designed by",
        subtitle: null,
        subtitleHtml: { __typename: "Html", htmlText: "Tadao Ando" },
        icon: "SYSTEM_STAR",
        learnMoreButton: null,
        type: "LISTING_NOTABLE_DESIGNER",
        highlightValue: null,
      },
    ]);

    const result = extractListingData(html);
    const badge = result.badges!.find(
      (b) => b.badgeType === "LISTING_NOTABLE_DESIGNER",
    );
    expect(badge).toBeDefined();
    expect(badge!.value).toBe("Tadao Ando");
  });

  it("populates publications array from badge", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Featured in",
        subtitle: null,
        subtitleHtml: { __typename: "Html", htmlText: "Architectural Digest" },
        type: "LISTING_DESIGN_PUBLICATIONS",
      },
    ]);

    const result = extractListingData(html);
    expect(result.publications).toContain("Architectural Digest");
    expect(result.signalSource).toBe("badge_publication");
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it("falls back to subtitle field when subtitleHtml is absent", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Featured in",
        subtitle: "Dezeen",
        subtitleHtml: null,
        type: "LISTING_DESIGN_PUBLICATIONS",
      },
    ]);

    const result = extractListingData(html);
    const badge = result.badges!.find(
      (b) => b.badgeType === "LISTING_DESIGN_PUBLICATIONS",
    );
    expect(badge).toBeDefined();
    expect(badge!.value).toBe("Dezeen");
  });

  it("falls back to em-dash split on title when subtitle fields are absent", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Featured in — Remodelista",
        subtitle: null,
        subtitleHtml: null,
        type: "LISTING_DESIGN_PUBLICATIONS",
      },
    ]);

    const result = extractListingData(html);
    const badge = result.badges!.find(
      (b) => b.badgeType === "LISTING_DESIGN_PUBLICATIONS",
    );
    expect(badge).toBeDefined();
    expect(badge!.value).toBe("Remodelista");
  });

  it("does not extract a badge when subtitleHtml contains HTML tags (policy text)", () => {
    const html = wrapInAirbnbHtml([
      {
        __typename: "PdpHighlight",
        title: "Service animals",
        subtitle: null,
        subtitleHtml: {
          __typename: "Html",
          htmlText:
            "Service animals aren't pets, so there's no need to add them here.<br>Traveling with an emotional support animal?",
        },
        type: "LISTING_DESIGN_PUBLICATIONS",
      },
    ]);

    const result = extractListingData(html);
    const badge = result.badges!.find(
      (b) => b.badgeType === "LISTING_DESIGN_PUBLICATIONS",
    );
    // Should not extract this as a publication badge
    expect(badge).toBeUndefined();
  });
});

describe("matchPublicationsInText", () => {
  it("matches 'featured in Dwell' in description", () => {
    const badges = matchPublicationsInText(
      "This home was featured in Dwell magazine in 2023.",
    );
    expect(badges.some((b) => b.value === "Dwell")).toBe(true);
  });

  it("does not match casual mentions without context", () => {
    const badges = matchPublicationsInText("We love Dwell-style interiors.");
    expect(badges.some((b) => b.value === "Dwell")).toBe(false);
  });
});

describe("detectCategories", () => {
  it("detects A-frame", () => {
    expect(detectCategories("Cozy A-Frame Retreat", "")).toContain("A-frame");
  });

  it("detects Treehouse", () => {
    expect(detectCategories("Treehouse in the Redwoods", "")).toContain(
      "Treehouse",
    );
  });

  it("returns empty array for generic home", () => {
    expect(
      detectCategories("Nice house", "Great location near the beach"),
    ).toHaveLength(0);
  });
});
