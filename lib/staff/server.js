import { createClient } from "../supabase/server";
export const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function staffContext() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return { response: json({ error: "Please sign in again." }, 401) };
  const result = await db
    .from("user_profiles")
    .select("user_id,first_name,last_name,role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.is_active || !["staff", "admin"].includes(result.data.role))
    return {
      response: json(
        { error: "Active staff or administrator access is required." },
        403,
      ),
    };
  return { db, user, profile: result.data };
}
export function staffFailure(error) {
  console.error("Staff request failed:", error.code || "unknown");
  const code = error.code;
  if (code === "23P01")
    return json(
      {
        error:
          "This time overlaps another scheduled interview for the applicant, company, assigned staff member, or location.",
      },
      409,
    );
  if (code === "P0001") return json({ error: error.message }, 409); // Only deliberate workflow exceptions from the trusted RPC.
  const messages = {
    42501: "Active staff or administrator access is required.",
    P0002: "Record not found.",
    22023: "Invalid values. Check the form and refresh if the record changed.",
    23514: "The change violates a record rule. Check the dates and status.",
    23503: "A selected record is no longer available.",
    23505:
      "An interview already exists for this application. Refresh to reschedule it.",
    23502: "Complete all required fields.",
    "22P02": "Invalid record ID.",
    22007: "Invalid date or time.",
    22008: "Invalid date or time.",
  };
  const status =
    code === "42501"
      ? 403
      : code === "P0002"
        ? 404
        : code === "23505"
          ? 409
          : messages[code]
            ? 400
            : 500;
  return json(
    {
      error:
        messages[code] ||
        "Unable to load or save staff records. Please try again.",
    },
    status,
  );
}
