export const JOB_FIELDS = {
  job_title: [2, 100],
  job_description: [1, 2000],
  requirements: [1, 2000],
  location: [1, 500],
};
export const PROFILE_FIELDS = {
  company_name: [2, 100],
  description: [1, 2000],
  industry: [1, 100],
  address: [1, 500],
  contact_email: [3, 254],
  contact_phone: [7, 30],
};
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateWrite(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !["action", "id", "data"].includes(k))
  )
    throw new Error("Invalid request.");
  const { action, id, data = {} } = body;
  if (
    !["profile", "create_job", "edit_job", "close_job", "decision"].includes(
      action,
    )
  )
    throw new Error("Unsupported action.");
  if (
    ["edit_job", "close_job", "decision"].includes(action) &&
    !UUID.test(id || "")
  )
    throw new Error("Invalid record ID.");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid form data.");
  const fields =
    action === "profile"
      ? PROFILE_FIELDS
      : ["create_job", "edit_job"].includes(action)
        ? JOB_FIELDS
        : {};
  const extra =
    action === "profile"
      ? ["website"]
      : ["create_job", "edit_job"].includes(action)
        ? ["category_id", "employment_type"]
        : action === "decision"
          ? ["application_status"]
          : [];
  if (
    Object.keys(data).some(
      (k) => !Object.hasOwn(fields, k) && !extra.includes(k),
    )
  )
    throw new Error("Unsupported form field.");
  const cleaned = {};
  for (const [key, [min, max]] of Object.entries(fields)) {
    const value = typeof data[key] === "string" ? data[key].trim() : "";
    if (value.length < min || value.length > max)
      throw new Error(
        `${key.replaceAll("_", " ")} must contain ${min} to ${max} characters.`,
      );
    cleaned[key] = value;
  }
  if (action === "profile") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.contact_email))
      throw new Error("Enter a valid contact email.");
    if (
      !/^[0-9+(). -]+$/.test(cleaned.contact_phone) ||
      cleaned.contact_phone.replace(/\D/g, "").length < 7
    )
      throw new Error("Enter a valid contact phone.");
    const website = typeof data.website === "string" ? data.website.trim() : "";
    if (website) {
      let parsed;
      try {
        parsed = new URL(website);
      } catch {
        throw new Error("Enter a valid website URL.");
      }
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        website.length > 2048
      )
        throw new Error(
          "Website must use http:// or https:// and be at most 2048 characters.",
        );
    }
    cleaned.website = website || null;
  }
  if (["create_job", "edit_job"].includes(action)) {
    if (!UUID.test(data.category_id || ""))
      throw new Error("Choose a valid category.");
    if (
      !["Full-time", "Part-time", "Contract", "Internship"].includes(
        data.employment_type,
      )
    )
      throw new Error("Choose a valid employment type.");
    cleaned.category_id = data.category_id;
    cleaned.employment_type = data.employment_type;
  }
  if (action === "decision") {
    if (!["Hired", "Rejected"].includes(data.application_status))
      throw new Error("Choose Hired or Rejected.");
    cleaned.application_status = data.application_status;
  }
  return { action, id: id || null, data: cleaned };
}
