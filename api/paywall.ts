import { handlePaywallRequest } from "../server/paywall/http.js";

export async function POST(request: Request) {
  return handlePaywallRequest(request);
}
