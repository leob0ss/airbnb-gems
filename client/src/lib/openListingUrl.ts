/** Open an Airbnb listing URL. Same tab on mobile so returning from the app isn't an empty tab. */
export function openListingUrl(url: string): void {
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.assign(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
