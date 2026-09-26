import { createClient } from "../../../../lib/supabase/server";
export async function POST(request) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json(
      { error: "Cross-site request denied." },
      { status: 403 },
    );
  const db = await createClient();
  const { error } = await db.auth.signOut({ scope: "local" });
  if (error)
    return Response.json(
      { error: "Could not log out. Please try again." },
      { status: 500 },
    );
  return Response.json({ data: { signedOut: true } });
}
