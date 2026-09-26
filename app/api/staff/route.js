import { staffContext, json, staffFailure } from "../../../lib/staff/server";
import { validateStaffWrite, UUID } from "../../../lib/staff/validation.mjs";
export async function GET(request) {
  try {
    const { db, profile, response } = await staffContext();
    if (response) return response;
    const params = new URL(request.url).searchParams,
      section = params.get("section") || "overview";
    if (section === "overview") {
      const results = await Promise.all([
        db
          .from("company_profiles")
          .select("*", { count: "exact", head: true })
          .eq("review_status", "pending"),
        db
          .from("job_postings")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending"),
        db
          .from("applications")
          .select("*", { count: "exact", head: true })
          .in("application_status", [
            "Submitted",
            "Under Review",
            "Shortlisted",
          ]),
        db
          .from("interviews")
          .select("*", { count: "exact", head: true })
          .eq("interview_status", "Scheduled"),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return json({ data: { profile, stats: results.map((r) => r.count) } });
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
    const search = (params.get("search") || "").trim().slice(0, 100),
      pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const status = params.get("status");
    let query;
    const companyJoin =
      "company:company_profiles!inner(company_name,review_status,user_id)";
    const jobJoin = `job:job_postings!inner(job_title,company_id,${companyJoin})`;
    const personJoin =
      "applicant:user_profiles!applications_applicant_id_fkey(first_name,last_name,email,phone,is_active)";
    if (section === "assignees") {
      query = db
        .from("user_profiles")
        .select("user_id,first_name,last_name,role", { count: "exact" })
        .eq("is_active", true)
        .in("role", ["staff", "admin"])
        .order("first_name")
        .order("user_id");
      if (search) query = query.ilike("first_name", pattern);
    } else if (section === "companies") {
      query = db
        .from("company_profiles")
        .select(
          "*,representative:user_profiles!company_profiles_user_id_fkey(first_name,last_name,email,is_active)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("user_id");
      if (search) query = query.ilike("company_name", pattern);
      if (status) query = query.eq("review_status", status);
    } else if (section === "jobs") {
      query = db
        .from("job_postings")
        .select(`*,${companyJoin},job_categories(category_name)`, {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("job_id");
      if (search) query = query.ilike("job_title", pattern);
      if (status) query = query.eq("status", status);
    } else if (section === "applications") {
      query = db
        .from("applications")
        .select(`*,${jobJoin},${personJoin},interviews(*)`, { count: "exact" })
        .order("application_date", { ascending: false })
        .order("application_id");
      if (search) query = query.ilike("job.job_title", pattern);
      if (status) query = query.eq("application_status", status);
    } else if (section === "interviews") {
      query = db
        .from("interviews")
        .select(
          `*,application:applications!inner(application_id,application_status,applicant_id,${jobJoin},${personJoin}),host:user_profiles!interviews_staff_id_fkey(first_name,last_name,is_active)`,
          { count: "exact" },
        )
        .order("starts_at")
        .order("interview_id");
      if (search) query = query.ilike("interview_location", pattern);
      if (status) query = query.eq("interview_status", status);
      const host = params.get("host");
      if (host) {
        if (!UUID.test(host)) return json({ error: "Invalid staff ID." }, 400);
        query = query.eq("staff_id", host);
      }
    } else return json({ error: "Unknown section." }, 400);
    const result = await query.range((page - 1) * limit, page * limit - 1);
    if (result.error) throw result.error;
    return json({ data: result.data, count: result.count, page, limit });
  } catch (error) {
    return staffFailure(error);
  }
}
export async function POST(request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return json({ error: "Cross-site request denied." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return json({ error: "JSON request required." }, 415);
    const { db, response } = await staffContext();
    if (response) return response;
    let input;
    try {
      const body = await request.text();
      if (body.length > 20000)
        return json({ error: "Request is too large." }, 413);
      input = validateStaffWrite(JSON.parse(body));
    } catch (error) {
      return json(
        {
          error:
            error instanceof SyntaxError
              ? "Invalid JSON request."
              : error.message,
        },
        400,
      );
    }
    const result = await db.rpc("staff_portal_write", {
      p_action: input.action,
      p_id: input.id,
      p_data: input.data,
    });
    if (result.error) throw result.error;
    return json({ data: result.data });
  } catch (error) {
    return staffFailure(error);
  }
}
