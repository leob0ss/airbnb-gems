import { handleDescribeRequest } from "../server/describe/describe.js";

export async function POST(request: Request) {
  return handleDescribeRequest(request);
}
