import { createClient } from "../../../lib/supabase/server";
import { validateWrite, UUID } from "../../../lib/company/validation.mjs";

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function context() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return { response: json({ error: "Please sign in again." }, 401) };
  const result = await db
    .from("user_profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (result.data?.role !== "company" || !result.data.is_active)
    return {
      response: json({ error: "An active company account is required." }, 403),
    };
  return { db, user };
}
function failure(error) {
  console.error("Company portal request failed:", error.code || "unknown");
  const status =
    {
      42501: 403,
      P0002: 404,
      P0001: 409,
      23505: 409,
      23503: 400,
      23514: 400,
      23502: 400,
      "22P02": 400,
      22023: 400,
    }[error.code] || 500;
  const messages = {
    42501: "Your account or company approval does not allow this action.",
    P0002: "Record not found.",
    P0001:
      "This decision is unavailable. The application must be shortlisted and its interview completed or cancelled.",
    23505: "This record already exists.",
    23503: "The selected record is no longer available.",
    23514: "Please check the submitted values.",
    23502: "Please complete all required fields.",
    "22P02": "Invalid record ID.",
    22023: "Invalid request.",
  };
  return json(
    {
      error:
        messages[error.code] ||
        "Unable to load or save company records. Please try again or contact the administrator.",
    },
    status,
  );
}
export async function GET(request) {
  try {
    const { db, user, response } = await context();
    if (response) return response;
    const params = new URL(request.url).searchParams;
    const section = params.get("section") || "overview";
    if (section === "overview") {
      const results = await Promise.all([
        db.from("company_profiles").select("*").eq("user_id", user.id).single(),
        db
          .from("job_categories")
          .select("*")
          .order("category_name")
          .limit(1000),
        db
          .from("job_postings")
          .select("*", { count: "exact", head: true })
          .eq("status", "Approved"),
        db.from("applications").select("*", { count: "exact", head: true }),
        db
          .from("applications")
          .select("*", { count: "exact", head: true })
          .in("application_status", ["Submitted", "Under Review"]),
        db
          .from("interviews")
          .select("*", { count: "exact", head: true })
          .eq("interview_status", "Scheduled"),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return json({
        data: {
          company: results[0].data,
          categories: results[1].data,
          stats: results.slice(2).map((r) => r.count),
        },
      });
    }
    const page = Number(params.get("page") || 1),
      limit = Number(params.get("limit") || 20);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      return json({ error: "Invalid page or limit." }, 400);
    let query;
    if (section === "jobs") {
      query = db
        .from("job_postings")
        .select("*,job_categories(category_name)", { count: "exact" })
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .order("job_id");
      const search = (params.get("search") || "").trim().slice(0, 100);
      if (search)
        query = query.ilike(
          "job_title",
          `%${search.replace(/[\\%_]/g, "\\$&")}%`,
        );
      const category = params.get("category");
      if (category) {
        if (!UUID.test(category))
          return json({ error: "Invalid category." }, 400);
        query = query.eq("category_id", category);
      }
      if (params.get("status"))
        query = query.eq("status", params.get("status"));
    } else if (section === "applications") {
      query = db
        .from("applications")
        .select("*,job_postings!inner(job_title,company_id),interviews(*)", {
          count: "exact",
        })
        .eq("job_postings.company_id", user.id)
        .order("application_date", { ascending: false })
        .order("application_id");
      const job = params.get("job");
      if (job) {
        if (!UUID.test(job)) return json({ error: "Invalid job." }, 400);
        query = query.eq("job_id", job);
      }
      if (params.get("status"))
        query = query.eq("application_status", params.get("status"));
    } else if (section === "interviews") {
      query = db
        .from("interviews")
        .select(
          "*,applications!inner(application_id,applicant_id,job_postings!inner(job_title,company_id))",
          { count: "exact" },
        )
        .eq("applications.job_postings.company_id", user.id)
        .order("starts_at")
        .order("interview_id");
      if (params.get("status"))
        query = query.eq("interview_status", params.get("status"));
    } else return json({ error: "Unknown section." }, 400);
    const result = await query.range((page - 1) * limit, page * limit - 1);
    if (result.error) throw result.error;
    let contacts = [];
    if (section !== "jobs" && result.data.length) {
      const ids = result.data.map((r) =>
        section === "applications"
          ? r.application_id
          : r.applications.application_id,
      );
      const r = await db.rpc("company_application_contacts", { p_ids: ids });
      if (r.error) throw r.error;
      contacts = r.data;
    }
    return json({
      data: result.data,
      contacts,
      count: result.count,
      page,
      limit,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return json({ error: "Cross-site request denied." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return json({ error: "JSON request required." }, 415);
    const { db, response } = await context();
    if (response) return response;
    let input;
    try {
      input = validateWrite(await request.json());
    } catch (error) {
      return json({ error: error.message || "Invalid request." }, 400);
    }
    const result = await db.rpc("company_portal_write", {
      p_action: input.action,
      p_id: input.id,
      p_data: input.data,
    });
    if (result.error) throw result.error;
    return json(
      { data: result.data },
      input.action === "create_job" ? 201 : 200,
    );
  } catch (error) {
    return failure(error);
  }
}
