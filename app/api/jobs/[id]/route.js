import { createClient } from "../../../../lib/supabase/server";
import { json, applicantFailure } from "../../../../lib/applicant/server";
import { UUID } from "../../../../lib/applicant/validation.mjs";
export async function GET(request, { params }) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Invalid job ID." }, 400);
  try {
    const db = await createClient();
    const result = await db.rpc("browse_available_jobs", {
      p_job_id: id,
      p_limit: 1,
    });
    if (result.error) throw result.error;
    const job = result.data?.data?.[0];
    return job
      ? json({ data: job })
      : json(
          {
            error: "This job is no longer accepting applications.",
            code: "job_unavailable",
          },
          404,
        );
  } catch (e) {
    return applicantFailure(e);
  }
}
