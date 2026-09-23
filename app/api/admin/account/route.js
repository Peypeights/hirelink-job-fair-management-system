import { adminRedirect, authorizeAdminPost, isUuid } from "../../../../lib/admin/post";

export async function POST(request) {
  const context = await authorizeAdminPost(request);
  if (context.denied) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const id = form.get("user_id");
  const role = form.get("role");
  const active = form.get("active");
  if (!isUuid(id) || id === context.user.id ||
      !["applicant", "company", "staff"].includes(role) ||
      !["true", "false"].includes(active)) {
    return adminRedirect("invalid", "accounts");
  }

  const { error } = await context.supabase.rpc("admin_update_account", {
    p_user_id: id,
    p_active: active === "true",
    p_role: role,
  });
  if (error) {
    console.error("Account update failed:", error.code);
    return adminRedirect("error", "accounts");
  }
  return adminRedirect("updated", "accounts");
}
