import { submitPaywallEvent } from "./submitPaywallEvent.js";

export async function handlePaywallRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = await submitPaywallEvent(body);

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Paywall] Submit failed:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
