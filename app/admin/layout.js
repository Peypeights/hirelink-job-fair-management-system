import { requireRole } from "../../lib/auth/requireRole";

export default async function AdminLayout({
  children,
}) {
  await requireRole("admin");

  return children;
}