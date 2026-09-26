export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const APPLICATION_NEXT = {
  Submitted: ["Under Review"],
  "Under Review": ["Shortlisted", "Rejected"],
  Shortlisted: ["Hired", "Rejected"],
  Hired: [],
  Rejected: [],
};
export const INTERVIEW_KEYS = [
  "interview_id",
  "application_id",
  "staff_id",
  "starts_at",
  "ends_at",
  "interview_location",
  "interview_status",
];
export function interviewSnapshot(row) {
  return row
    ? Object.fromEntries(INTERVIEW_KEYS.map((k) => [k, row[k]]))
    : null;
}
export function philippineInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function philippineISO(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  )
    throw new Error("Enter a valid interview date and time.");
  const date = new Date(value + ":00+08:00");
  if (
    !Number.isFinite(date.getTime()) ||
    philippineInput(date.toISOString()) !== value
  )
    throw new Error("Enter a valid interview date and time.");
  return date.toISOString();
}
function timestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
export function validateStaffWrite(body) {
  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object" ||
    Object.keys(body).some((k) => !["action", "id", "data"].includes(k))
  )
    throw new Error("Invalid request.");
  const { action, id, data } = body;
  const allowed = {
    review_company: ["status", "expected_updated_at"],
    review_job: ["status", "expected_updated_at"],
    application_status: [
      "status",
      "expected_status",
      "company_decision_confirmed",
    ],
    schedule: [
      "staff_id",
      "starts_at",
      "ends_at",
      "interview_location",
      "expected_interview",
    ],
    interview_status: ["status", "expected_interview"],
  };
  if (!Object.hasOwn(allowed, action) || !UUID.test(id || ""))
    throw new Error("Invalid action or record ID.");
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !allowed[action].includes(k))
  )
    throw new Error("Unsupported form field.");
  if (action.startsWith("review_")) {
    const choices =
      action === "review_company"
        ? ["approved", "rejected"]
        : ["Approved", "Rejected"];
    if (!choices.includes(data.status) || !timestamp(data.expected_updated_at))
      throw new Error("Invalid review. Refresh and try again.");
  }
  if (action === "application_status") {
    if (
      !Object.hasOwn(APPLICATION_NEXT, data.expected_status) ||
      !APPLICATION_NEXT[data.expected_status].includes(data.status)
    )
      throw new Error("This application status change is not allowed.");
    if (
      ["Hired", "Rejected"].includes(data.status) &&
      data.company_decision_confirmed !== true
    )
      throw new Error("Confirm that you are recording the company decision.");
  }
  if (["schedule", "interview_status"].includes(action)) {
    if (!Object.hasOwn(data, "expected_interview"))
      throw new Error("Refresh the interview before saving.");
    const old = data.expected_interview;
    if (
      old !== null &&
      (typeof old !== "object" ||
        Array.isArray(old) ||
        INTERVIEW_KEYS.some((k) => !Object.hasOwn(old, k)) ||
        Object.keys(old).some((k) => !INTERVIEW_KEYS.includes(k)))
    )
      throw new Error("Invalid interview snapshot.");
  }
  if (action === "schedule") {
    if (!UUID.test(data.staff_id || ""))
      throw new Error("Choose an assigned staff member.");
    if (
      !timestamp(data.starts_at) ||
      !timestamp(data.ends_at) ||
      Date.parse(data.ends_at) <= Date.parse(data.starts_at)
    )
      throw new Error("End time must be later than start time.");
    const location =
      typeof data.interview_location === "string"
        ? data.interview_location.trim().replace(/\s+/g, " ")
        : "";
    if (!location || location.length > 500)
      throw new Error("Location must contain 1 to 500 characters.");
    return { action, id, data: { ...data, interview_location: location } };
  }
  if (
    action === "interview_status" &&
    (!["Completed", "Cancelled"].includes(data.status) ||
      data.expected_interview === null)
  )
    throw new Error("Invalid interview status.");
  return { action, id, data };
}
