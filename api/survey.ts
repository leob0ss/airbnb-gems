import { handleSurveyRequest } from "../server/survey/http.js";

export async function POST(request: Request) {
  return handleSurveyRequest(request);
}
