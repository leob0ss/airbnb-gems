import { handleSearchOutcomeRequest } from "../server/searchOutcome/http.js";

export async function POST(request: Request) {
  return handleSearchOutcomeRequest(request);
}
