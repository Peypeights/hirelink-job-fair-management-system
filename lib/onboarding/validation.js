export const ONBOARDING_LIMITS = Object.freeze({
  firstName: { min: 2, max: 100 },
  lastName: { min: 2, max: 100 },
  companyName: { min: 2, max: 100 },
  description: { min: 1, max: 2000 },
  industry: { min: 1, max: 100 },
  address: { min: 1, max: 500 },
  contactEmail: { min: 3, max: 254 },
  contactPhone: { min: 7, max: 30 },
  website: { min: 8, max: 2048 },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]+$/;

function trimmedValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRequiredField(errors, field, value, label) {
  const limits = ONBOARDING_LIMITS[field];
  const cleanedValue = trimmedValue(value);

  if (!cleanedValue) {
    errors[field] = `${label} is required.`;
    return;
  }

  if (cleanedValue.length < limits.min || cleanedValue.length > limits.max) {
    errors[field] = `${label} must contain ${limits.min} to ${limits.max} characters.`;
  }
}

export function validateOnboardingFields({
  firstName,
  lastName,
  role,
  companyName,
  description,
  industry,
  address,
  contactEmail,
  contactPhone,
  website,
}) {
  const errors = {};

  validateRequiredField(errors, "firstName", firstName, "First name");
  validateRequiredField(errors, "lastName", lastName, "Last name");

  if (role !== "applicant" && role !== "company") {
    errors.role = "Please choose a valid HireLink role.";
    return errors;
  }

  if (role !== "company") {
    return errors;
  }

  validateRequiredField(errors, "companyName", companyName, "Company name");
  validateRequiredField(
    errors,
    "description",
    description,
    "Company description"
  );
  validateRequiredField(errors, "industry", industry, "Industry");
  validateRequiredField(errors, "address", address, "Address");
  validateRequiredField(
    errors,
    "contactEmail",
    contactEmail,
    "Contact email"
  );
  validateRequiredField(
    errors,
    "contactPhone",
    contactPhone,
    "Contact phone"
  );

  const cleanedContactEmail = trimmedValue(contactEmail);
  if (
    !errors.contactEmail &&
    !EMAIL_PATTERN.test(cleanedContactEmail)
  ) {
    errors.contactEmail = "Enter a valid contact email address.";
  }

  const cleanedContactPhone = trimmedValue(contactPhone);
  if (
    !errors.contactPhone &&
    (!PHONE_PATTERN.test(cleanedContactPhone) ||
      cleanedContactPhone.replace(/\D/g, "").length < 7)
  ) {
    errors.contactPhone = "Enter a valid contact phone number.";
  }

  const cleanedWebsite = trimmedValue(website);
  if (cleanedWebsite) {
    if (cleanedWebsite.length < ONBOARDING_LIMITS.website.min) {
      errors.website = "Website must be a valid URL.";
    } else if (cleanedWebsite.length > ONBOARDING_LIMITS.website.max) {
      errors.website = `Website must not exceed ${ONBOARDING_LIMITS.website.max} characters.`;
    } else {
      try {
        const parsedWebsite = new URL(cleanedWebsite);

        if (
          parsedWebsite.protocol !== "http:" &&
          parsedWebsite.protocol !== "https:"
        ) {
          errors.website = "Website must use http:// or https://.";
        }
      } catch {
        errors.website = "Enter a valid website URL.";
      }
    }
  }

  return errors;
}

export function normalizeOptionalWebsite(value) {
  const cleanedWebsite = trimmedValue(value);
  return cleanedWebsite || null;
}

export function normalizeOnboardingValue(value) {
  return trimmedValue(value);
}
