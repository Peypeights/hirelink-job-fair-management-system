import { createClient } from "../../../../lib/supabase/server";
import { json, applicantFailure } from "../../../../lib/applicant/server";
export async function POST(request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return json({ error: "Cross-site request denied." }, 403);
    const db = await createClient();
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error)
      return json({ error: "Could not log out. Please try again." }, 500);
    return json({ data: { signedOut: true } });
  } catch (e) {
    return applicantFailure(e);
  }
}
