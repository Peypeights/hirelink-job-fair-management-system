"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./onboarding.module.css";
import { createClient } from "../../lib/supabase/client";
import {
  ONBOARDING_LIMITS,
  normalizeOptionalWebsite,
  validateOnboardingFields,
} from "../../lib/onboarding/validation";

const PUBLIC_ROLES = new Set(["applicant", "company"]);

function metadataText(value) {
  return typeof value === "string" ? value : "";
}

export default function OnboardingPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [roleLocked, setRoleLocked] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [provider, setProvider] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      // Someone manually opened /onboarding without logging in.
      if (userError || !user) {
        router.replace("/auth");
        return;
      }

      const metadata = user.user_metadata || {};
      const metadataRole =
        typeof metadata.role === "string" ? metadata.role : "";

      if (metadataRole && !PUBLIC_ROLES.has(metadataRole)) {
        router.replace("/auth");
        return;
      }

      let socialFirstName = metadataText(
        metadata.given_name || metadata.first_name
      );
      let socialLastName = metadataText(
        metadata.family_name || metadata.last_name
      );
      const socialFullName = metadataText(
        metadata.full_name || metadata.name
      );

      if (
        (!socialFirstName || !socialLastName) &&
        socialFullName
      ) {
        const nameParts = socialFullName.trim().split(/\s+/);

        if (nameParts.length === 1) {
          socialFirstName = socialFirstName || nameParts[0];
        } else {
          socialFirstName =
            socialFirstName || nameParts.slice(0, -1).join(" ");
          socialLastName =
            socialLastName || nameParts[nameParts.length - 1];
        }
      }

      const {
        data: existingProfile,
        error: profileError,
      } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, role, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError) {
        setError("We couldn't check your HireLink profile.");
        setPageLoading(false);
        return;
      }

      let selectedRole = metadataRole;
      let selectedRoleLocked = metadataRole === "company";

      if (existingProfile) {
        if (!existingProfile.is_active) {
          router.replace("/auth");
          return;
        }

        if (existingProfile.role === "applicant") {
          router.replace("/dashboard");
          return;
        }

        if (existingProfile.role === "company") {
          const {
            data: existingCompanyProfile,
            error: companyProfileError,
          } = await supabase
            .from("company_profiles")
            .select("user_id, review_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (cancelled) {
            return;
          }

          if (companyProfileError) {
            setError("We couldn't check your company profile.");
            setPageLoading(false);
            return;
          }

          if (existingCompanyProfile) {
            router.replace("/dashboard");
            return;
          }

          selectedRole = "company";
          selectedRoleLocked = true;
          socialFirstName = socialFirstName || existingProfile.first_name || "";
          socialLastName = socialLastName || existingProfile.last_name || "";
        } else {
          router.replace("/dashboard");
          return;
        }
      }

      setFirstName(socialFirstName);
      setLastName(socialLastName);
      setRole(selectedRole);
      setRoleLocked(selectedRoleLocked);
      setCompanyName(
        typeof metadata.company_name === "string"
          ? metadata.company_name
          : ""
      );
      setContactEmail(user.email || "");
      setProvider(user.app_metadata?.provider || "social");
      setPageLoading(false);
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateField(setter, field) {
    return (event) => {
      setter(event.target.value);

      setFieldErrors((currentErrors) => {
        if (!currentErrors[field]) {
          return currentErrors;
        }

        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setFieldErrors({});

    const cleanedValues = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
      description: description.trim(),
      industry: industry.trim(),
      address: address.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      website: normalizeOptionalWebsite(website),
    };

    const validationErrors = validateOnboardingFields({
      ...cleanedValues,
      role,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(Object.values(validationErrors)[0]);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...cleanedValues,
          role,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (response.status === 409) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        setError(result.error || "We couldn't complete your profile.");
        setSaving(false);
        return;
      }

      router.replace(
        role === "company"
          ? "/company/pending-review"
          : "/dashboard"
      );
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  function getProviderName() {
    if (provider === "google") {
      return "Google";
    }

    if (provider === "facebook") {
      return "Facebook";
    }

    if (provider === "email") {
      return "email";
    }

    return "your account";
  }

  if (pageLoading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loader}></div>
        <p>Preparing your HireLink profile...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        {/* LEFT SIDE */}

        <aside className={styles.hero}>
          <div className={styles.glowOne}></div>
          <div className={styles.glowTwo}></div>

          <div className={styles.heroContent}>
            <div className={styles.logo}>
              <div className={styles.logoMark}>
                <span></span>
                <span></span>
              </div>

              <div>
                <h1>HireLink</h1>
                <p>Job Fair Management System</p>
              </div>
            </div>

            <div className={styles.heroText}>
              <p className={styles.eyebrow}>ONE LAST STEP</p>

              <h2>
                Let&apos;s finish your
                <br />
                <span>HireLink profile.</span>
              </h2>

              <p className={styles.description}>
                Tell us how you&apos;ll be using HireLink so we can give you the
                right experience from the start.
              </p>
            </div>

            <div className={styles.steps}>
              <div className={styles.stepCompleted}>
                <div className={styles.stepNumber}>✓</div>

                <div>
                  <strong>Account connected</strong>
                  <p>
                    Signed in securely with {getProviderName()}.
                  </p>
                </div>
              </div>

              <div className={styles.stepActive}>
                <div className={styles.stepNumber}>2</div>

                <div>
                  <strong>Complete your profile</strong>
                  <p>
                    Confirm your details and choose your role.
                  </p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>

                <div>
                  <strong>
                    {role === "company" ? "Submit for review" : "You're ready"}
                  </strong>
                  <p>
                    {role === "company"
                      ? "Staff will review your company profile."
                      : "Start using HireLink."}
                  </p>
                </div>
              </div>
            </div>

            <p className={styles.heroFooter}>CONNECT • DISCOVER • GROW</p>
          </div>
        </aside>

        {/* RIGHT SIDE */}

        <section className={styles.formSide}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <span className={styles.badge}>
                {role === "company" ? "Ready for review" : "Almost there"}
              </span>

              <h2>Complete your profile</h2>

              <p>
                {role === "company"
                  ? "Submit your company details for staff review. New company profiles start with pending status."
                  : `We&apos;ve filled in what we could from ${getProviderName()}. Review your details before continuing.`}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.nameGrid}>
                <div className={styles.field}>
                  <label htmlFor="firstName">
                    {role === "company"
                      ? "Representative First Name"
                      : "First Name"}
                  </label>

                  <div className={styles.inputWrapper}>
                    <UserIcon />

                    <input
                      id="firstName"
                      type="text"
                      maxLength={ONBOARDING_LIMITS.firstName.max}
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={updateField(setFirstName, "firstName")}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={
                        fieldErrors.firstName ? "firstName-error" : undefined
                      }
                    />
                  </div>

                  {fieldErrors.firstName && (
                    <span id="firstName-error" className={styles.fieldError}>
                      {fieldErrors.firstName}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">
                    {role === "company"
                      ? "Representative Last Name"
                      : "Last Name"}
                  </label>

                  <div className={styles.inputWrapper}>
                    <UserIcon />

                    <input
                      id="lastName"
                      type="text"
                      maxLength={ONBOARDING_LIMITS.lastName.max}
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={updateField(setLastName, "lastName")}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={
                        fieldErrors.lastName ? "lastName-error" : undefined
                      }
                    />
                  </div>

                  {fieldErrors.lastName && (
                    <span id="lastName-error" className={styles.fieldError}>
                      {fieldErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.roleSection}>
                <div className={styles.roleHeading}>
                  <label>How will you use HireLink?</label>

                  <span>{roleLocked ? "Company account" : "Choose one"}</span>
                </div>

                <div className={styles.roleGrid}>
                  <button
                    type="button"
                    className={`${styles.roleCard} ${
                      role === "applicant" ? styles.selectedRole : ""
                    }`}
                    onClick={() => setRole("applicant")}
                    disabled={roleLocked}
                    aria-pressed={role === "applicant"}
                  >
                    <div className={styles.roleTop}>
                      <div className={styles.roleIcon}>
                        <UserIcon />
                      </div>

                      <span className={styles.radio}>
                        <span></span>
                      </span>
                    </div>

                    <strong>Applicant</strong>

                    <p>
                      Discover jobs, submit applications, and track your
                      progress.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`${styles.roleCard} ${
                      role === "company" ? styles.selectedRole : ""
                    }`}
                    onClick={() => setRole("company")}
                    disabled={roleLocked}
                    aria-pressed={role === "company"}
                  >
                    <div className={styles.roleTop}>
                      <div className={styles.roleIcon}>
                        <BuildingIcon />
                      </div>

                      <span className={styles.radio}>
                        <span></span>
                      </span>
                    </div>

                    <strong>Company Representative</strong>

                    <p>
                      Represent your company, manage jobs, and connect with
                      applicants.
                    </p>
                  </button>
                </div>
              </div>

              {role === "company" && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="companyName">Company Name</label>

                    <div className={styles.inputWrapper}>
                      <BuildingIcon />

                      <input
                        id="companyName"
                        type="text"
                        maxLength={ONBOARDING_LIMITS.companyName.max}
                        placeholder="Enter your company name"
                        value={companyName}
                        onChange={updateField(setCompanyName, "companyName")}
                        aria-invalid={Boolean(fieldErrors.companyName)}
                        aria-describedby={
                          fieldErrors.companyName
                            ? "companyName-error"
                            : undefined
                        }
                      />
                    </div>

                    {fieldErrors.companyName && (
                      <span id="companyName-error" className={styles.fieldError}>
                        {fieldErrors.companyName}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="description">Company Description</label>

                    <div className={`${styles.inputWrapper} ${styles.textareaWrapper}`}>
                      <textarea
                        id="description"
                        maxLength={ONBOARDING_LIMITS.description.max}
                        placeholder="Describe your company and what it does"
                        value={description}
                        onChange={updateField(setDescription, "description")}
                        aria-invalid={Boolean(fieldErrors.description)}
                        aria-describedby={
                          fieldErrors.description
                            ? "description-error"
                            : undefined
                        }
                      />
                    </div>

                    {fieldErrors.description && (
                      <span id="description-error" className={styles.fieldError}>
                        {fieldErrors.description}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="industry">Industry</label>

                    <div className={styles.inputWrapper}>
                      <BuildingIcon />

                      <input
                        id="industry"
                        type="text"
                        maxLength={ONBOARDING_LIMITS.industry.max}
                        placeholder="e.g. Information Technology"
                        value={industry}
                        onChange={updateField(setIndustry, "industry")}
                        aria-invalid={Boolean(fieldErrors.industry)}
                        aria-describedby={
                          fieldErrors.industry ? "industry-error" : undefined
                        }
                      />
                    </div>

                    {fieldErrors.industry && (
                      <span id="industry-error" className={styles.fieldError}>
                        {fieldErrors.industry}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="address">Address</label>

                    <div className={`${styles.inputWrapper} ${styles.textareaWrapper}`}>
                      <textarea
                        id="address"
                        maxLength={ONBOARDING_LIMITS.address.max}
                        placeholder="Enter your company address"
                        value={address}
                        onChange={updateField(setAddress, "address")}
                        aria-invalid={Boolean(fieldErrors.address)}
                        aria-describedby={
                          fieldErrors.address ? "address-error" : undefined
                        }
                      />
                    </div>

                    {fieldErrors.address && (
                      <span id="address-error" className={styles.fieldError}>
                        {fieldErrors.address}
                      </span>
                    )}
                  </div>

                  <div className={styles.nameGrid}>
                    <div className={styles.field}>
                      <label htmlFor="contactEmail">Contact Email</label>

                      <div className={styles.inputWrapper}>
                        <EmailIcon />

                        <input
                          id="contactEmail"
                          type="email"
                          maxLength={ONBOARDING_LIMITS.contactEmail.max}
                          placeholder="company@example.com"
                          value={contactEmail}
                          onChange={updateField(setContactEmail, "contactEmail")}
                          aria-invalid={Boolean(fieldErrors.contactEmail)}
                          aria-describedby={
                            fieldErrors.contactEmail
                              ? "contactEmail-error"
                              : undefined
                          }
                        />
                      </div>

                      {fieldErrors.contactEmail && (
                        <span
                          id="contactEmail-error"
                          className={styles.fieldError}
                        >
                          {fieldErrors.contactEmail}
                        </span>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="contactPhone">Contact Phone</label>

                      <div className={styles.inputWrapper}>
                        <PhoneIcon />

                        <input
                          id="contactPhone"
                          type="tel"
                          maxLength={ONBOARDING_LIMITS.contactPhone.max}
                          placeholder="+63 900 000 0000"
                          value={contactPhone}
                          onChange={updateField(setContactPhone, "contactPhone")}
                          aria-invalid={Boolean(fieldErrors.contactPhone)}
                          aria-describedby={
                            fieldErrors.contactPhone
                              ? "contactPhone-error"
                              : undefined
                          }
                        />
                      </div>

                      {fieldErrors.contactPhone && (
                        <span
                          id="contactPhone-error"
                          className={styles.fieldError}
                        >
                          {fieldErrors.contactPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="website">Website (optional)</label>

                    <div className={styles.inputWrapper}>
                      <GlobeIcon />

                      <input
                        id="website"
                        type="url"
                        maxLength={ONBOARDING_LIMITS.website.max}
                        placeholder="https://yourcompany.com"
                        value={website}
                        onChange={updateField(setWebsite, "website")}
                        aria-invalid={Boolean(fieldErrors.website)}
                        aria-describedby={
                          fieldErrors.website ? "website-error" : undefined
                        }
                      />
                    </div>

                    {fieldErrors.website && (
                      <span id="website-error" className={styles.fieldError}>
                        {fieldErrors.website}
                      </span>
                    )}
                  </div>

                  <div className={styles.companyNote}>
                    <InfoIcon />

                    <p>
                      Submitting sends your company profile to staff for
                      review. Its initial status will be pending.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.continueButton}
                disabled={saving}
              >
                {saving
                  ? "Submitting your profile..."
                  : role === "company"
                  ? "Submit for staff review"
                  : "Continue to HireLink"}

                {!saving && <ArrowIcon />}
              </button>

              <p className={styles.securityText}>
                Your HireLink role can only be Applicant or Company
                Representative during public registration.
              </p>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}

/* ---------------- ICONS ---------------- */

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c0-5 2.8-8 7-8s7 3 7 8" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4h10v17M15 9h4v12" />
      <path d="M8 8h4M8 12h4M8 16h4M18 13h1M18 17h1" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 3.5h3l1.4 4-2.1 1.7a15.5 15.5 0 0 0 6 6l1.7-2.1 4 1.4v3c0 1.1-.9 2-2 2C11.2 19.5 4.5 12.8 4.5 5.5c0-1.1.9-2 2-2Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.2 2.4 3.2 5.4 3.2 9S14.2 18.6 12 21M12 3C9.8 5.4 8.8 8.4 8.8 12s1 6.6 3.2 9" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}
