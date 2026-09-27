import { createClient } from "../supabase/server";
export const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function applicantContext() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return {
      response: json(
        { error: "Please sign in to continue.", code: "auth_required" },
        401,
      ),
    };
  const result = await db
    .from("user_profiles")
    .select("user_id,first_name,last_name,email,phone,role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.is_active || result.data.role !== "applicant")
    return {
      response: json(
        {
          error: "An active applicant account is required.",
          code: "access_denied",
        },
        403,
      ),
    };
  return { db, user, profile: result.data };
}
export function applicantFailure(error) {
  console.error("Applicant request failed:", error.code || "unknown");
  const code = error.code;
  if (code === "23505")
    return json(
      {
        error:
          "You have already applied for this job. Check My applications for updates.",
        code: "already_applied",
      },
      409,
    );
  if (code === "P0001")
    return json(
      {
        error:
          "This job is no longer accepting applications. Browse other available jobs.",
        code: "job_unavailable",
      },
      409,
    );
  if (code === "P0002")
    return json(
      { error: "This record is no longer available.", code: "not_found" },
      404,
    );
  if (code === "42501")
    return json(
      {
        error: "An active applicant account is required.",
        code: "access_denied",
      },
      403,
    );
  if (["22023", "23514", "23502", "22P02", "23503"].includes(code))
    return json({ error: "Please check the form values and try again." }, 400);
  return json(
    { error: "We could not load or save your information. Please try again." },
    500,
  );
}
