import { requireCompanyRouteAccess } from "../../lib/auth/companyRouting";
export default async function CompanyLayout({ children }) {
  // Pending/rejected companies can correct their profile and view existing records.
  await requireCompanyRouteAccess();
  return children;
}
