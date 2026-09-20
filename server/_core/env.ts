export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  notifyEmail: process.env.NOTIFY_EMAIL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "",
  posthogKey:
    process.env.POSTHOG_PROJECT_API_KEY ||
    process.env.VITE_POSTHOG_PROJECT_TOKEN ||
    "",
  posthogHost: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
};
