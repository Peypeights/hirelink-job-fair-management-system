import {
  applicantContext,
  json,
  applicantFailure,
} from "../../../lib/applicant/server";
import {
  pagination,
  validateApplicantWrite,
  APPLICATION_STATUSES,
  INTERVIEW_STATUSES,
} from "../../../lib/applicant/validation.mjs";
const jobFields =
  "job:job_postings!inner(job_id,job_title,job_description,requirements,location,employment_type,status,company:company_profiles!inner(company_name,description,industry,address,website,contact_email,contact_phone),job_categories(category_name))";
const interviewFields = `*,application:applications!inner(application_id,application_status,applicant_id,${jobFields})`;
export async function GET(request) {
  try {
    const { db, user, profile, response } = await applicantContext();
    if (response) return response;
    const params = new URL(request.url).searchParams,
      section = params.get("section") || "overview";
    if (section === "overview") {
      const now = new Date().toISOString();
      const results = await Promise.all([
        db
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("applicant_id", user.id),
        db
          .from("interviews")
          .select("interview_id,application:applications!inner(applicant_id)", {
            count: "exact",
            head: true,
          })
          .eq("application.applicant_id", user.id)
          .eq("interview_status", "Scheduled")
          .gte("ends_at", now),
        db
          .from("interviews")
          .select(interviewFields)
          .eq("application.applicant_id", user.id)
          .eq("interview_status", "Scheduled")
          .gte("ends_at", now)
          .order("starts_at")
          .limit(1),
        db.rpc("browse_available_jobs", { p_limit: 1 }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return json({
        data: {
          profile,
          application_count: results[0].count,
          interview_count: results[1].count,
          next_interview: results[2].data[0] || null,
          available_count: results[3].data.count,
        },
      });
    }
    let page, limit;
    try {
      ({ page, limit } = pagination(params));
    } catch (e) {
      return json({ error: e.message }, 400);
    }
    const status = params.get("status") || "";
    let query;
    if (section === "applications") {
      if (status && !APPLICATION_STATUSES.includes(status))
        return json({ error: "Invalid application status." }, 400);
      query = db
        .from("applications")
        .select(`*,${jobFields},interviews(*)`, { count: "exact" })
        .eq("applicant_id", user.id)
        .order("application_date", { ascending: false })
        .order("application_id");
      if (status) query = query.eq("application_status", status);
    } else if (section === "interviews") {
      if (status && !INTERVIEW_STATUSES.includes(status))
        return json({ error: "Invalid interview status." }, 400);
      query = db
        .from("interviews")
        .select(interviewFields, { count: "exact" })
        .eq("application.applicant_id", user.id)
        .order("starts_at")
        .order("interview_id");
      if (status) query = query.eq("interview_status", status);
      if (params.get("upcoming") === "true")
        query = query
          .eq("interview_status", "Scheduled")
          .gte("ends_at", new Date().toISOString());
    } else return json({ error: "Unknown section." }, 400);
    const result = await query.range((page - 1) * limit, page * limit - 1);
    if (result.error) throw result.error;
    return json({ data: result.data, count: result.count, page, limit });
  } catch (e) {
    return applicantFailure(e);
  }
}
export async function POST(request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return json({ error: "Cross-site request denied." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return json({ error: "JSON request required." }, 415);
    const { db, response } = await applicantContext();
    if (response) return response;
    let input;
    try {
      const raw = await request.text();
      if (raw.length > 16000)
        return json({ error: "Request is too large." }, 413);
      input = validateApplicantWrite(JSON.parse(raw));
    } catch (e) {
      return json(
        {
          error: e instanceof SyntaxError ? "Invalid JSON request." : e.message,
        },
        400,
      );
    }
    const data = input.data;
    const result =
      input.action === "apply"
        ? await db.rpc("applicant_submit_application", {
            p_job_id: data.job_id,
            p_note: data.application_note,
          })
        : await db.rpc("applicant_update_profile", {
            p_first_name: data.first_name,
            p_last_name: data.last_name,
            p_phone: data.phone,
          });
    if (result.error) throw result.error;
    return json({ data: result.data }, input.action === "apply" ? 201 : 200);
  } catch (e) {
    return applicantFailure(e);
  }
}
