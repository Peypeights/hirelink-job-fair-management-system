import { requireRole } from "../../lib/auth/requireRole";

export default async function StaffLayout({
  children,
}) {
  await requireRole("staff");

  return children;
}