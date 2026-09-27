export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const APPLICATION_STATUSES = [
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Hired",
  "Rejected",
];
export const INTERVIEW_STATUSES = ["Scheduled", "Completed", "Cancelled"];
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];
export function pagination(params, defaultLimit = 12) {
  const page = Number(params.get("page") || 1),
    limit = Number(params.get("limit") || defaultLimit);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error("Invalid page or limit.");
  return { page, limit };
}
export function validateApplicantWrite(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !["action", "data"].includes(k))
  )
    throw new Error("Invalid request.");
  const { action, data } = body;
  const allowed =
    action === "apply"
      ? ["job_id", "application_note"]
      : action === "profile"
        ? ["first_name", "last_name", "phone"]
        : null;
  if (
    !allowed ||
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !allowed.includes(k))
  )
    throw new Error("Unsupported action or form field.");
  if (action === "apply") {
    if (!UUID.test(data.job_id || "")) throw new Error("Choose a valid job.");
    const note =
      typeof data.application_note === "string"
        ? data.application_note.trim()
        : "";
    if (note.length < 1 || note.length > 2000)
      throw new Error(
        "Your application note must contain 1 to 2,000 characters.",
      );
    return { action, data: { job_id: data.job_id, application_note: note } };
  }
  const result = {};
  for (const field of ["first_name", "last_name"]) {
    const value = typeof data[field] === "string" ? data[field].trim() : "";
    if (value.length < 2 || value.length > 100)
      throw new Error("First and last names must contain 2 to 100 characters.");
    result[field] = value;
  }
  if (
    data.phone !== undefined &&
    data.phone !== null &&
    typeof data.phone !== "string"
  ) {
    throw new Error("Enter a valid phone number, or leave it blank.");
  }
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  if (
    phone &&
    (phone.length < 7 ||
      phone.length > 30 ||
      !/^[0-9+(). -]+$/.test(phone) ||
      phone.replace(/\D/g, "").length < 7)
  )
    throw new Error("Enter a valid phone number, or leave it blank.");
  return { action, data: { ...result, phone: phone || null } };
}
