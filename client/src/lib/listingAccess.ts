export const FREE_LISTING_CLICKS = 4;

const CLICKS_KEY = "ag_listing_clicks";
const UNLOCKED_KEY = "ag_paywall_unlocked";

export function getListingClickCount(): number {
  return parseInt(sessionStorage.getItem(CLICKS_KEY) ?? "0", 10) || 0;
}

export function incrementListingClickCount(): number {
  const next = getListingClickCount() + 1;
  sessionStorage.setItem(CLICKS_KEY, String(next));
  return next;
}

export function isPaywallUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function markPaywallUnlocked(): void {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}

export function shouldShowPaywall(): boolean {
  return !isPaywallUnlocked() && getListingClickCount() >= FREE_LISTING_CLICKS;
}
