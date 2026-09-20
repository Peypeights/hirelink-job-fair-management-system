import { routeAuthenticatedUser } from "../../lib/auth/companyRouting";

export default async function DashboardPage() {
  await routeAuthenticatedUser();
}
