import { submitContact } from "./submitContact";

export async function handleContactRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = await submitContact(body);

    if (!result.success) {
      const status = result.error.includes("not configured") ? 503 : 400;
      return Response.json(result, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Contact] Submit failed:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
