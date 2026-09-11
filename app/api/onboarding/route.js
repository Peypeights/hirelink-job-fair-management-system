import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to complete onboarding.",
      },
      {
        status: 401,
      }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      {
        error:
          "Your social account did not provide an email address.",
      },
      {
        status: 400,
      }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request.",
      },
      {
        status: 400,
      }
    );
  }

  const firstName =
    typeof body.firstName === "string"
      ? body.firstName.trim()
      : "";

  const lastName =
    typeof body.lastName === "string"
      ? body.lastName.trim()
      : "";

  const companyName =
    typeof body.companyName === "string"
      ? body.companyName.trim()
      : "";

  const role = body.role;

  // Validate first name
  if (
    firstName.length < 2 ||
    firstName.length > 100
  ) {
    return NextResponse.json(
      {
        error:
          "First name must contain 2 to 100 characters.",
      },
      {
        status: 400,
      }
    );
  }

  // Validate last name
  if (
    lastName.length < 2 ||
    lastName.length > 100
  ) {
    return NextResponse.json(
      {
        error:
          "Last name must contain 2 to 100 characters.",
      },
      {
        status: 400,
      }
    );
  }

  // Public registration only allows these roles
  if (
    role !== "applicant" &&
    role !== "company"
  ) {
    return NextResponse.json(
      {
        error: "Invalid account type.",
      },
      {
        status: 400,
      }
    );
  }

  // Company accounts must provide company name
  if (
    role === "company" &&
    (
      companyName.length < 2 ||
      companyName.length > 100
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Company name must contain 2 to 100 characters.",
      },
      {
        status: 400,
      }
    );
  }

  // Check whether onboarding was already completed
  const {
    data: existingProfile,
    error: existingError,
  } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error(
      "Could not check existing profile:",
      existingError
    );

    return NextResponse.json(
      {
        error:
          "We couldn't check your existing profile.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingProfile) {
    return NextResponse.json(
      {
        error:
          "Your profile is already complete.",
      },
      {
        status: 409,
      }
    );
  }

  // Save onboarding information in Auth metadata
  const {
    error: metadataError,
  } = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      role,

      company_name:
        role === "company"
          ? companyName
          : null,
    },
  });

  if (metadataError) {
    console.error(
      "Could not save onboarding metadata:",
      metadataError
    );

    return NextResponse.json(
      {
        error:
          "We couldn't save your onboarding information.",
      },
      {
        status: 500,
      }
    );
  }

  // Create HireLink user profile
  const {
    data: profile,
    error: insertError,
  } = await supabase
    .from("user_profiles")
    .insert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      phone: null,
      role,
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
      "Onboarding profile creation failed:",
      insertError
    );

    return NextResponse.json(
      {
        error:
          "We couldn't create your HireLink profile.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      data: profile,
    },
    {
      status: 201,
    }
  );
}