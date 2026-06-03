export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  notifyEmail: process.env.NOTIFY_EMAIL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "",
};
