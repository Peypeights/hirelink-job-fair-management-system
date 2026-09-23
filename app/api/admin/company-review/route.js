import { adminRedirect, authorizeAdminPost, isUuid } from "../../../../lib/admin/post";

export async function POST(request) {
  const context = await authorizeAdminPost(request);
  if (context.denied) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const id = form.get("user_id");
  const status = form.get("status");
  if (!isUuid(id) || !["approved", "rejected", "pending"].includes(status)) {
    return adminRedirect("invalid", "reviews");
  }

  const { error } = await context.supabase.rpc("admin_review_company", {
    p_user_id: id,
    p_status: status,
  });
  if (error) {
    console.error("Company review failed:", error.code);
    return adminRedirect("error", "reviews");
  }
  return adminRedirect("reviewed", "reviews");
}
