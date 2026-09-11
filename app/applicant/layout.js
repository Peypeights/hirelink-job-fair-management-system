import { requireRole } from "../../lib/auth/requireRole";

export default async function ApplicantLayout({
  children,
}) {
  await requireRole("applicant");

  return children;
}