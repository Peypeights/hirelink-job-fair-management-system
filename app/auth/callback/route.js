import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function getSiteOrigin(request) {
  // GitHub Codespaces
  if (
    process.env.CODESPACES === "true" &&
    process.env.CODESPACE_NAME &&
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ) {
    return `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
  }

  // Normal local development / future production fallback
  return new URL(request.url).origin;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const origin = getSiteOrigin(request);

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?oauth=error`
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "OAuth code exchange failed:",
      exchangeError
    );

    return NextResponse.redirect(
      `${origin}/auth?oauth=error`
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      `${origin}/auth?oauth=error`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "OAuth profile check failed:",
      profileError
    );

    return NextResponse.redirect(
      `${origin}/auth?oauth=error`
    );
  }

  // New Google/Facebook user
  if (!profile) {
    return NextResponse.redirect(
      `${origin}/onboarding`
    );
  }

  // Returning user
  return NextResponse.redirect(
   `${origin}/dashboard`
  );
}