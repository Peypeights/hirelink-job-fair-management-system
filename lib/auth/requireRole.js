import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

export async function requireRole(expectedRole) {
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
      "Could not check user profile:",
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

  if (profile.role !== expectedRole) {
    redirect("/dashboard");
  }

  return {
    user,
    profile,
  };
}