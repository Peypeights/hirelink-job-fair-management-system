import { createClient } from "../../../lib/supabase/server";
import { json, applicantFailure } from "../../../lib/applicant/server";
import { pagination } from "../../../lib/applicant/validation.mjs";
export async function GET(request) {
  try {
    let page, limit;
    try {
      ({ page, limit } = pagination(new URL(request.url).searchParams, 100));
    } catch (e) {
      return json({ error: e.message }, 400);
    }
    const db = await createClient();
    const result = await db
      .from("job_categories")
      .select("category_id,category_name,description", { count: "exact" })
      .order("category_name")
      .order("category_id")
      .range((page - 1) * limit, page * limit - 1);
    if (result.error) throw result.error;
    return json({ data: result.data, count: result.count, page, limit });
  } catch (e) {
    return applicantFailure(e);
  }
}
