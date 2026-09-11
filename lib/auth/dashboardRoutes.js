export const DASHBOARD_ROUTES = {
  applicant: "/applicant/dashboard",
  company: "/company/dashboard",
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
};

export function getDashboardRoute(role) {
  return DASHBOARD_ROUTES[role] || null;
}