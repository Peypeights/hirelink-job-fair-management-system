"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./onboarding.module.css";
import { createClient } from "../../lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [provider, setProvider] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Someone manually opened /onboarding without logging in.
      if (userError || !user) {
        router.replace("/auth");
        return;
      }

      /*
        If this user already has a HireLink profile,
        they should not complete onboarding again.
      */
      const { data: existingProfile, error: profileError } =
        await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) {
        setError("We couldn't check your HireLink profile.");
        setPageLoading(false);
        return;
      }

      if (existingProfile) {
        router.replace("/dashboard");
        return;
      }

      /*
        Google and Facebook normally give Supabase
        the person's name.

        Different providers can use slightly
        different metadata names, so we check both.
      */
      const metadata = user.user_metadata || {};
          
      let socialFirstName =
        metadata.given_name ||
        metadata.first_name ||
        "";
          
      let socialLastName =
        metadata.family_name ||
        metadata.last_name ||
        "";
          
      const socialFullName =
        metadata.full_name ||
        metadata.name ||
        "";
          
      if (
        (!socialFirstName || !socialLastName) &&
        socialFullName
      ) {
        const nameParts = socialFullName
          .trim()
          .split(/\s+/);
      
        if (nameParts.length === 1) {
          socialFirstName =
            socialFirstName || nameParts[0];
        } else {
          socialFirstName =
            socialFirstName ||
            nameParts.slice(0, -1).join(" ");
        
          socialLastName =
            socialLastName ||
            nameParts[nameParts.length - 1];
        }
      }
      
      setFirstName(socialFirstName);
      setLastName(socialLastName);
      
      setCompanyName(
        metadata.company_name || ""
      );

      setProvider(
        user.app_metadata?.provider || "social"
      );

      setPageLoading(false);
    }

    loadUser();
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();
    const cleanedCompanyName = companyName.trim();
      
    if (
      cleanedFirstName.length < 2 ||
      cleanedFirstName.length > 100
    ) {
      setError(
        "First name must contain 2 to 100 characters."
      );
      return;
    }
    
    if (
      cleanedLastName.length < 2 ||
      cleanedLastName.length > 100
    ) {
      setError(
        "Last name must contain 2 to 100 characters."
      );
      return;
    }

    if (!role) {
      setError("Please choose your HireLink role.");
      return;
    }
    
    if (
      role === "company" &&
      (
        cleanedCompanyName.length < 2 ||
        cleanedCompanyName.length > 100
      )
    ) {
      setError(
        "Company name must contain 2 to 100 characters."
      );
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
          firstName: cleanedFirstName,
          lastName: cleanedLastName,
          companyName:
            role === "company"
              ? cleanedCompanyName
              : null,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          router.replace("/dashboard");
          return;
        }

        setError(
          result.error ||
            "We couldn't complete your profile."
        );

        setSaving(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );

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

    return "your social account";
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
              <p className={styles.eyebrow}>
                ONE LAST STEP
              </p>

              <h2>
                Let&apos;s finish your
                <br />
                <span>HireLink profile.</span>
              </h2>

              <p className={styles.description}>
                Tell us how you&apos;ll be using
                HireLink so we can give you the
                right experience from the start.
              </p>
            </div>

            <div className={styles.steps}>
              <div className={styles.stepCompleted}>
                <div className={styles.stepNumber}>✓</div>

                <div>
                  <strong>Account connected</strong>
                  <p>
                    Signed in securely with{" "}
                    {getProviderName()}.
                  </p>
                </div>
              </div>

              <div className={styles.stepActive}>
                <div className={styles.stepNumber}>2</div>

                <div>
                  <strong>Complete your profile</strong>
                  <p>
                    Confirm your details and choose
                    your role.
                  </p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>

                <div>
                  <strong>You&apos;re ready</strong>
                  <p>
                    Start using HireLink.
                  </p>
                </div>
              </div>
            </div>

            <p className={styles.heroFooter}>
              CONNECT • DISCOVER • GROW
            </p>
          </div>
        </aside>

        {/* RIGHT SIDE */}

        <section className={styles.formSide}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <span className={styles.badge}>
                Almost there
              </span>

              <h2>Complete your profile</h2>

              <p>
                We&apos;ve filled in what we could
                from {getProviderName()}. Review your
                details before continuing.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
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
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(event.target.value)
                      }
                    />
                  </div>
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
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(event) =>
                        setLastName(event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.roleSection}>
                <div className={styles.roleHeading}>
                  <label>
                    How will you use HireLink?
                  </label>

                  <span>Choose one</span>
                </div>

                <div className={styles.roleGrid}>
                  <button
                    type="button"
                    className={`${styles.roleCard} ${
                      role === "applicant"
                        ? styles.selectedRole
                        : ""
                    }`}
                    onClick={() =>
                      setRole("applicant")
                    }
                  >
                    <div className={styles.roleTop}>
                      <div
                        className={
                          styles.roleIcon
                        }
                      >
                        <UserIcon />
                      </div>

                      <span className={styles.radio}>
                        <span></span>
                      </span>
                    </div>

                    <strong>Applicant</strong>

                    <p>
                      Discover jobs, submit
                      applications, and track your
                      progress.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`${styles.roleCard} ${
                      role === "company"
                        ? styles.selectedRole
                        : ""
                    }`}
                    onClick={() =>
                      setRole("company")
                    }
                  >
                    <div className={styles.roleTop}>
                      <div
                        className={
                          styles.roleIcon
                        }
                      >
                        <BuildingIcon />
                      </div>

                      <span className={styles.radio}>
                        <span></span>
                      </span>
                    </div>

                    <strong>
                      Company Representative
                    </strong>

                    <p>
                      Represent your company,
                      manage jobs, and connect with
                      applicants.
                    </p>
                  </button>
                </div>
              </div>

              {role === "company" && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="companyName">
                      Company Name
                    </label>

                    <div className={styles.inputWrapper}>
                      <BuildingIcon />

                      <input
                        id="companyName"
                        type="text"
                        placeholder="Enter your company name"
                        value={companyName}
                        onChange={(event) =>
                          setCompanyName(event.target.value)
                        }
                      />
                    </div>
                      
                    <small>
                      This will be used when you set up
                      your company profile.
                    </small>
                  </div>
                      
                  <div className={styles.companyNote}>
                    <InfoIcon />
                      
                    <p>
                      You&apos;ll provide additional company
                      details after completing your account setup.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.continueButton}
                disabled={saving}
              >
                {saving
                  ? "Setting up your profile..."
                  : "Continue to HireLink"}

                {!saving && <ArrowIcon />}
              </button>

              <p className={styles.securityText}>
                Your HireLink role can only be
                Applicant or Company Representative
                during public registration.
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
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />

      <path d="M5 21c0-5 2.8-8 7-8s7 3 7 8" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 21V4h10v17M15 9h4v12" />

      <path d="M8 8h4M8 12h4M8 16h4M18 13h1M18 17h1" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />

      <path d="M12 11v6M12 7.5h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}