import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  normalizeOnboardingValue,
  normalizeOptionalWebsite,
  validateOnboardingFields,
} from "../../../lib/onboarding/validation";

const PUBLIC_ROLES = new Set(["applicant", "company"]);

function errorResponse(error, status, fieldErrors) {
  return NextResponse.json(
    {
      error,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status }
  );
}

export async function POST(request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse(
      "You must be signed in to complete onboarding.",
      401
    );
  }

  if (!user.email) {
    return errorResponse(
      "Your account must have an email address to complete onboarding.",
      400
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Invalid request.", 400);
  }

  const requestedRole = body.role;

  if (!PUBLIC_ROLES.has(requestedRole)) {
    return errorResponse("Invalid account type.", 400);
  }

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role
      : null;

  if (
    metadataRole &&
    !PUBLIC_ROLES.has(metadataRole)
  ) {
    return errorResponse("Invalid account type.", 400);
  }

  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from("user_profiles")
    .select("user_id, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    console.error(
      "Could not check existing profile:",
      existingProfileError.code || "unknown"
    );

    return errorResponse(
      "We couldn't check your existing profile.",
      500
    );
  }

  let role = requestedRole;

  if (existingProfile) {
    if (!existingProfile.is_active) {
      return errorResponse("This account is inactive.", 403);
    }

    if (!PUBLIC_ROLES.has(existingProfile.role)) {
      return errorResponse(
        "This account cannot complete public onboarding.",
        403
      );
    }

    if (existingProfile.role !== requestedRole) {
      return errorResponse(
        "Your HireLink role cannot be changed during onboarding.",
        409
      );
    }

    role = existingProfile.role;

    if (role === "applicant") {
      return errorResponse(
        "Your profile is already complete.",
        409
      );
    }

    const {
      data: existingCompanyProfile,
      error: existingCompanyProfileError,
    } = await supabase
      .from("company_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCompanyProfileError) {
      console.error(
        "Could not check existing company profile:",
        existingCompanyProfileError.code || "unknown"
      );

      return errorResponse(
        "We couldn't check your existing company profile.",
        500
      );
    }

    if (existingCompanyProfile) {
      return errorResponse(
        "Your company profile is already complete.",
        409
      );
    }
  } else if (metadataRole === "company") {
    // A company email signup records the role in Auth metadata. Keep that
    // role locked even if a caller tampers with the request body.
    if (requestedRole !== "company") {
      return errorResponse(
        "Company registration must be completed as a company account.",
        400
      );
    }

    role = "company";
  }

  if (
    role === "company" &&
    body.website !== undefined &&
    body.website !== null &&
    typeof body.website !== "string"
  ) {
    return errorResponse(
      "Website must be a valid URL.",
      400,
      { website: "Website must be a valid URL." }
    );
  }

  const normalizedValues = {
    firstName: normalizeOnboardingValue(body.firstName),
    lastName: normalizeOnboardingValue(body.lastName),
    companyName: normalizeOnboardingValue(body.companyName),
    description: normalizeOnboardingValue(body.description),
    industry: normalizeOnboardingValue(body.industry),
    address: normalizeOnboardingValue(body.address),
    contactEmail: normalizeOnboardingValue(body.contactEmail),
    contactPhone: normalizeOnboardingValue(body.contactPhone),
    website: normalizeOptionalWebsite(body.website),
  };

  const fieldErrors = validateOnboardingFields({
    ...normalizedValues,
    role,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return errorResponse(
      Object.values(fieldErrors)[0],
      400,
      fieldErrors
    );
  }

  if (role === "company") {
    const { data, error: onboardingError } = await supabase.rpc(
      "complete_company_onboarding",
      {
        p_first_name: normalizedValues.firstName,
        p_last_name: normalizedValues.lastName,
        p_company_name: normalizedValues.companyName,
        p_description: normalizedValues.description,
        p_industry: normalizedValues.industry,
        p_address: normalizedValues.address,
        p_contact_email: normalizedValues.contactEmail,
        p_contact_phone: normalizedValues.contactPhone,
        p_website: normalizedValues.website,
      }
    );

    if (onboardingError) {
      console.error(
        "Company onboarding transaction failed:",
        onboardingError.code || "unknown"
      );

      if (onboardingError.code === "23505") {
        return errorResponse(
          "Your company profile is already complete.",
          409
        );
      }

      return errorResponse(
        "We couldn't complete your company profile.",
        500
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  }

  // Preserve the existing applicant onboarding path.
  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      first_name: normalizedValues.firstName,
      last_name: normalizedValues.lastName,
      role: "applicant",
      company_name: null,
    },
  });

  if (metadataError) {
    console.error(
      "Could not save applicant onboarding metadata:",
      metadataError.code || "unknown"
    );

    return errorResponse(
      "We couldn't save your onboarding information.",
      500
    );
  }

  const {
    data: profile,
    error: insertError,
  } = await supabase
    .from("user_profiles")
    .insert({
      user_id: user.id,
      first_name: normalizedValues.firstName,
      last_name: normalizedValues.lastName,
      email: user.email,
      phone: null,
      role: "applicant",
      is_active: true,
    })
    .select(
      `
        user_id,
        first_name,
        last_name,
        email,
        role,
        is_active
      `
    )
    .single();

  if (insertError) {
    console.error(
      "Applicant onboarding profile creation failed:",
      insertError.code || "unknown"
    );

    if (insertError.code === "23505") {
      return errorResponse(
        "Your profile is already complete.",
        409
      );
    }

    return errorResponse(
      "We couldn't create your HireLink profile.",
      500
    );
  }

  return NextResponse.json(
    { data: profile },
    { status: 201 }
  );
}
