import { requireRole } from "../../lib/auth/requireRole";

export default async function CompanyLayout({
  children,
}) {
  await requireRole("company");

  return children;
}