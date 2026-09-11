import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();

  // Get the real authenticated user.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "You must be signed in to complete onboarding.",
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

  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim()
      : "";

  const role = body.role;

  // Server-side validation.
  if (
    fullName.length < 2 ||
    fullName.length > 100
  ) {
    return NextResponse.json(
      {
        error:
          "Full name must contain 2 to 100 characters.",
      },
      {
        status: 400,
      }
    );
  }

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

  // Do not allow onboarding twice.
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
        error: "Your profile is already complete.",
      },
      {
        status: 409,
      }
    );
  }

  /*
    Notice what the browser CANNOT choose here:

    user_id   → from logged-in Supabase user
    email     → from logged-in Supabase user
    phone     → null
    is_active → true

    The browser only supplied:
    fullName and role.
  */

  const {
    data: profile,
    error: insertError,
  } = await supabase
    .from("user_profiles")
    .insert({
      user_id: user.id,
      full_name: fullName,
      email: user.email,
      phone: null,
      role,
      is_active: true,
    })
    .select(
      "user_id, full_name, email, role, is_active"
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