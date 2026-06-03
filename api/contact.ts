import { handleContactRequest } from "../server/contact/http.js";

export async function POST(request: Request) {
  return handleContactRequest(request);
}
