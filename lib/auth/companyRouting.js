import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { getDashboardRoute } from "./dashboardRoutes";

export const COMPANY_REVIEW_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

async function loadRoutingContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      profile: null,
      companyProfile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load profile for routing:", profileError.code || "unknown");

    return {
      supabase,
      user,
      profile: null,
      companyProfile: null,
      profileError: true,
    };
  }

  if (!profile || profile.role !== "company") {
    return {
      supabase,
      user,
      profile,
      companyProfile: null,
    };
  }

  const {
    data: companyProfile,
    error: companyProfileError,
  } = await supabase
    .from("company_profiles")
    .select("user_id, company_name, review_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (companyProfileError) {
    console.error(
      "Could not load company profile for routing:",
      companyProfileError.code || "unknown"
    );

    return {
      supabase,
      user,
      profile,
      companyProfile: null,
      companyProfileError: true,
    };
  }

  return {
    supabase,
    user,
    profile,
    companyProfile,
  };
}

function getCompanyStatusDestination(companyProfile) {
  if (!companyProfile) {
    return "/onboarding";
  }

  if (
    companyProfile.review_status === COMPANY_REVIEW_STATUS.PENDING
  ) {
    return "/company/pending-review";
  }

  if (
    companyProfile.review_status === COMPANY_REVIEW_STATUS.APPROVED
  ) {
    return "/company/dashboard";
  }

  return "/auth";
}

function redirectForCompanyStatus(companyProfile) {
  redirect(getCompanyStatusDestination(companyProfile));
}

export async function routeAuthenticatedUser() {
  const {
    user,
    profile,
    companyProfile,
    profileError,
    companyProfileError,
  } = await loadRoutingContext();

  if (!user) {
    redirect("/auth");
  }

  if (profileError || companyProfileError) {
    redirect("/auth");
  }

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.is_active) {
    redirect("/auth");
  }

  if (profile.role === "company") {
    redirectForCompanyStatus(companyProfile);
  }

  const dashboardRoute = getDashboardRoute(profile.role);

  if (!dashboardRoute) {
    redirect("/auth");
  }

  redirect(dashboardRoute);
}

export async function requireCompanyRouteAccess({
  allowPending = false,
  requirePending = false,
} = {}) {
  const {
    user,
    profile,
    companyProfile,
    profileError,
    companyProfileError,
  } = await loadRoutingContext();

  if (!user) {
    redirect("/auth");
  }

  if (profileError || companyProfileError) {
    redirect("/auth");
  }

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.is_active) {
    redirect("/auth");
  }

  if (profile.role !== "company") {
    const dashboardRoute = getDashboardRoute(profile.role);

    if (dashboardRoute) {
      redirect(dashboardRoute);
    }

    redirect("/auth");
  }

  if (!companyProfile) {
    redirect("/onboarding");
  }

  const companyStatusDestination =
    getCompanyStatusDestination(companyProfile);

  if (
    companyProfile.review_status === COMPANY_REVIEW_STATUS.PENDING
  ) {
    if (allowPending || requirePending) {
      return {
        user,
        profile,
        companyProfile,
      };
    }

    redirect("/company/pending-review");
  }

  if (
    companyProfile.review_status === COMPANY_REVIEW_STATUS.APPROVED
  ) {
    if (requirePending) {
      redirect(companyStatusDestination);
    }

    return {
      user,
      profile,
      companyProfile,
    };
  }

  redirect(companyStatusDestination);
}
