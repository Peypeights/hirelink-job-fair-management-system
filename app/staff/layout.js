import { requireRole } from "../../lib/auth/requireRole";

export default async function StaffLayout({ children }) {
  await requireRole(["staff", "admin"]);

  return children;
}
