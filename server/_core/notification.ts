import { ENV } from "./env.js";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (!title) throw new Error("Notification title is required.");
  if (!content) throw new Error("Notification content is required.");
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error(`Notification title must be at most ${TITLE_MAX_LENGTH} characters.`);
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new Error(`Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`);
  }

  return { title, content };
}

/**
 * Notify the product owner about survey, filter, or contact submissions.
 * Uses Resend when configured; otherwise logs and returns success so UX isn't blocked.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.resendApiKey || !ENV.notifyEmail) {
    console.info(`[Notification] ${title}\n${content}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.resendFrom || "Airbnb Gems <onboarding@resend.dev>",
        to: [ENV.notifyEmail],
        subject: title,
        text: content,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Notification] Resend failed (${response.status}): ${detail}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error sending email:", error);
    return false;
  }
}
