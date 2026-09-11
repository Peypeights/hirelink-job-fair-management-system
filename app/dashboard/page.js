import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { getDashboardRoute } from "../../lib/auth/dashboardRoutes";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Could not load user profile:",
      profileError
    );

    redirect("/auth");
  }

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.is_active) {
    redirect("/auth");
  }

  const dashboardRoute =
    getDashboardRoute(profile.role);

  if (!dashboardRoute) {
    redirect("/auth");
  }

  redirect(dashboardRoute);
}