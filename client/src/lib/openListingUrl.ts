function isMobile(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

/**
 * Open a URL once an async search finishes. Browsers may block new tabs that
 * open seconds after the click, so fall back to navigating this tab.
 */
export function openUrlAfterSearch(url: string): void {
  const tab = isMobile() ? null : window.open(url, "_blank");
  if (tab) tab.opener = null;
  else window.location.assign(url);
}

/** Open an Airbnb listing URL. Same tab on mobile so returning from the app isn't an empty tab. */
export function openListingUrl(url: string): void {
  if (isMobile()) {
    window.location.assign(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
