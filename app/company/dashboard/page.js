import { requireCompanyRouteAccess } from "../../../lib/auth/companyRouting";
import CompanyPortal from "./CompanyPortal";
export default async function CompanyDashboard() {
  await requireCompanyRouteAccess();
  return <CompanyPortal />;
}
