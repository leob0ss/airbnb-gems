import { insertContactSubmission, isContactDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";

export interface ContactSubmitInput {
  message: string;
  email?: string | null;
}

export type ContactSubmitResult =
  | { success: true; id: number }
  | { success: false; error: string };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseContactInput(
  body: unknown,
): ContactSubmitResult | ContactSubmitInput {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { message, email } = body as Record<string, unknown>;

  if (typeof message !== "string" || !message.trim()) {
    return { success: false, error: "Message is required." };
  }

  if (message.trim().length > 2000) {
    return {
      success: false,
      error: "Message must be at most 2000 characters.",
    };
  }

  let normalizedEmail: string | null = null;
  if (email != null && email !== "") {
    if (typeof email !== "string" || !validateEmail(email.trim())) {
      return { success: false, error: "Please enter a valid email address." };
    }
    normalizedEmail = email.trim();
  }

  return {
    message: message.trim(),
    email: normalizedEmail,
  };
}

export async function submitContact(
  body: unknown,
): Promise<ContactSubmitResult> {
  const parsed = parseContactInput(body);
  if ("success" in parsed) return parsed;

  if (!isContactDbConfigured()) {
    return {
      success: false,
      error: "Contact form is not configured (missing POSTGRES_URL).",
    };
  }

  const id = await insertContactSubmission(
    parsed.message,
    parsed.email ?? null,
  );

  const emailLine = parsed.email ? `\n\nFrom: ${parsed.email}` : "";
  await notifyOwner({
    title: "Contact: new message",
    content: `${parsed.message}${emailLine}`,
  });

  return { success: true, id };
}
