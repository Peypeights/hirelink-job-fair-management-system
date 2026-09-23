import { createClient } from "../../../lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    console.error("Admin sign out failed:", error.code);
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/dashboard?notice=logout-error" },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: "/auth" },
  });
}
