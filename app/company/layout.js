import { requireCompanyRouteAccess } from "../../lib/auth/companyRouting";

export default async function CompanyLayout({
  children,
}) {
  // The pending page lives below this layout, so it must be able to render
  // pending companies while the dashboard page still enforces approval.
  await requireCompanyRouteAccess({ allowPending: true });

  return children;
}
