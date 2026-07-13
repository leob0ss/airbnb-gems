const VISITOR_KEY = "ag_visitor_id";

/** Stable anonymous ID for this browser (survives tab closes / returning tomorrow). */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private mode / blocked storage — fall back to an in-memory ID for this page load
    return crypto.randomUUID();
  }
}
