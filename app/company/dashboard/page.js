import { requireCompanyRouteAccess } from "../../../lib/auth/companyRouting";

export default async function CompanyDashboard() {
  await requireCompanyRouteAccess();

  return (
    <main>
      <h1>Company Dashboard</h1>

      <p>
        Company representative dashboard template.
      </p>
    </main>
  );
}
