import { createClient } from "../supabase/server";

export function adminRedirect(notice, section) {
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/dashboard?notice=${notice}#${section}` },
  });
}

export async function authorizeAdminPost(request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  // Form submissions from our page must come from the current site.
  if (fetchSite && fetchSite !== "same-origin") return { denied: true };
  if (origin) {
    try {
      const source = new URL(origin);
      const destination = new URL(request.url);
      if (source.hostname !== destination.hostname) return { denied: true };
    } catch {
      return { denied: true };
    }
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { denied: true };
  const { data: profile, error: profileError } = await supabase.from("user_profiles")
    .select("role, is_active").eq("user_id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || !profile.is_active) return { denied: true };
  return { supabase, user };
}

export function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
