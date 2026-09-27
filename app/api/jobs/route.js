import { createClient } from "../../../lib/supabase/server";
import { json, applicantFailure } from "../../../lib/applicant/server";
import {
  pagination,
  UUID,
  EMPLOYMENT_TYPES,
} from "../../../lib/applicant/validation.mjs";
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let paging;
    try {
      paging = pagination(params);
    } catch (e) {
      return json({ error: e.message }, 400);
    }
    const search = (params.get("search") || "").trim(),
      category = params.get("category_id") || null,
      type = params.get("employment_type") || "";
    if (
      search.length > 100 ||
      (category && !UUID.test(category)) ||
      (type && !EMPLOYMENT_TYPES.includes(type))
    )
      return json({ error: "Invalid search filters." }, 400);
    const db = await createClient();
    const result = await db.rpc("browse_available_jobs", {
      p_search: search,
      p_category: category,
      p_type: type,
      p_page: paging.page,
      p_limit: paging.limit,
    });
    if (result.error) throw result.error;
    return json(result.data);
  } catch (e) {
    return applicantFailure(e);
  }
}
