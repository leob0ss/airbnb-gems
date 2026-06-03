import { handleFilterRequestRequest } from "../server/filterRequest/http.js";

export async function POST(request: Request) {
  return handleFilterRequestRequest(request);
}
