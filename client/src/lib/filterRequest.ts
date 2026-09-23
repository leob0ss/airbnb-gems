import { toast } from "sonner";

export type FilterRequestPayload = {
  whatLookingFor: string;
  email?: string | null;
  visitorId: string;
  feature?: string;
};

/**
 * POST to /api/filter-request after the dialog has already closed.
 * `keepalive` lets the request finish if the visitor leaves the page.
 * Resolves to an error message, or null on success.
 */
export async function submitInBackground(
  payload: FilterRequestPayload,
  { silent = false }: { silent?: boolean } = {},
): Promise<string | null> {
  let error: string | null = null;
  try {
    const response = await fetch("/api/filter-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };
    if (!response.ok || !data.success) {
      error = data.error ?? `HTTP ${response.status}`;
    }
  } catch {
    error = "network";
  }

  if (error && !silent) {
    toast.error("We couldn’t save that. Please try again.");
  }
  return error;
}
