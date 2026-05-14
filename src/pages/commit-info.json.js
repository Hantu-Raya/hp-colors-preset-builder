import { getGitCommitInfo } from "../gitCommitInfo.js";

export function GET() {
  return new Response(JSON.stringify(getGitCommitInfo()), {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "Content-Type": "application/json"
    }
  });
}
