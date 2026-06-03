import { handleContactRequest } from "../server/contact/http";

export async function POST(request: Request) {
  return handleContactRequest(request);
}
