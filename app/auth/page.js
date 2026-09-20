"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import { createClient } from "../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("applicant");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (mode === "signup") {
      await handleSignUp();
    } else {
      await handleLogin();
    }
  }

  async function handleSignUp() {
    if (firstName.trim().length < 2) {
      showError("Please enter your first name.");
      return;
    }

    if (lastName.trim().length < 2) {
      showError("Please enter your last name.");
      return;
    }

    if (firstName.trim().length > 100) {
      showError("First name must not exceed 100 characters.");
      return;
    }

    if (lastName.trim().length > 100) {
      showError("Last name must not exceed 100 characters.");
      return;
    }

    if (
      role === "company" &&
      companyName.trim().length < 2
    ) {
      showError("Please enter your company name.");
      return;
    }

if (
  role === "company" &&
  companyName.trim().length > 100
) {
  showError("Company name must not exceed 100 characters.");
  return;
}

    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      showError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      showError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,

      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,

          ...(role === "company" && {
            company_name: companyName.trim(),
          }),
        },
      },
    });

    setLoading(false);

    if (error) {
      if (
        error.code === "user_already_exists" ||
        error.code === "email_exists" ||
        error.message.toLowerCase().includes("already registered")
      ) {
        showError(
          "This email is already associated with an existing HireLink account. Please log in instead."
        );
        return;
      }
    
      showError(error.message);
      return;
    }

  // Supabase may return a fake user instead of an error
  // when the email already belongs to a confirmed account.
  if (data.user?.identities?.length === 0) {
    showError(
      "This email is already associated with an existing HireLink account. Please log in instead."
    );
    return;
  }
  
  if (data.user) {
    setMessageType("success");

    if (data.session) {
      if (role === "company") {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setMessage("Account created successfully.");
    } else {
      setMessage(
        "Account created. Please check your email to confirm your account."
      );
    }
  }
}

  async function handleLogin() {
    if (!email.trim() || !password) {
      showError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    setMessageType("success");
    setMessage("Login successful. Redirecting...");

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider) {
    setMessage("");
    setMessageType("");
    
    const { error } =
      await supabase.auth.signInWithOAuth({
        provider,
      
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    
    if (error) {
      showError(error.message);
    }
  }

  function showError(text) {
    setMessageType("error");
    setMessage(text);
  }

  function switchMode(newMode) {
    setMode(newMode);

    setMessage("");
    setMessageType("");

    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className={styles.page}>
      <section className={styles.authContainer}>
        {/* LEFT SIDE */}

        <aside className={styles.hero}>
          <div className={styles.glowOne}></div>
          <div className={styles.glowTwo}></div>
          <div className={styles.heroArc}></div>

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

            <p className={styles.eyebrow}>
              PEOPLE <span>×</span> OPPORTUNITIES <span>×</span> BRIGHTER FUTURES
            </p>

            <div className={styles.heroHeading}>
              <h2>
                Find opportunities.
                <br />
                <span>Build</span> your future.
              </h2>

              <p>
                HireLink connects talented individuals with forward-thinking
                companies through seamless job fair experiences.
              </p>
            </div>

            <div className={styles.features}>
              <FeatureCard
                icon={<SearchIcon />}
                title="Browse Jobs"
                description="Discover opportunities from top companies in one place."
              />

              <FeatureCard
                icon={<PeopleIcon />}
                title="Connect with Companies"
                description="Meet recruiters and make meaningful connections."
              />

              <FeatureCard
                icon={<DocumentIcon />}
                title="Manage Applications"
                description="Track your progress and stay updated throughout your journey."
              />
            </div>

            <div className={styles.heroBottom}>
              <div>
                <p className={styles.scriptText}>
                  More than jobs.
                  <br />
                  A brighter tomorrow.
                </p>
              </div>

              <div className={styles.heroWords}>
                <span>IGNITE</span>
                <span>CONNECT</span>
                <span>GROW</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE */}

        <section className={styles.formSide}>
          <div className={styles.welcome}>
            Welcome to a brighter tomorrow
            <span></span>
          </div>

          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h2>
                {mode === "signup"
                  ? "Create your account"
                  : "Welcome back"}
              </h2>

              <p>
                {mode === "signup"
                  ? "Join HireLink and be part of a bigger tomorrow."
                  : "Log in to continue your HireLink journey."}
              </p>
            </div>

            <div className={styles.tabs}>
                <button
                    type="button"
                    className={`${styles.tab} ${
                    mode === "login" ? styles.activeTab : ""
                    }`}
                    onClick={() => switchMode("login")}
                >
                <LoginIcon />
                Log In
              </button>

              <button
                type="button"
                className={`${styles.tab} ${
                  mode === "signup" ? styles.activeTab : ""
                }`}
                onClick={() => switchMode("signup")}
              >
                <UserPlusIcon />
                Sign Up
              </button>
            </div>

            <div className={styles.socialButtons}>
              <button
                type="button"
                className={styles.socialButton}
                onClick={() => handleOAuth("google")}
              >
                <Image
                    src="/icons/google.svg"
                    alt=""
                    width={20}
                    height={20}
                />
                Continue with Google
              </button>

              <button
                type="button"
                className={styles.socialButton}
                onClick={() => handleOAuth("facebook")}
              >
                <Image
                    src="/icons/facebook.svg"
                    alt=""
                    width={20}
                    height={20}
                />
                Continue with Facebook
              </button>
            </div>

            <div className={styles.divider}>
              <span></span>
              <p>or continue with email</p>
              <span></span>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className={styles.passwordGrid}>
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
                          placeholder={
                            role === "company"
                              ? "Representative first name"
                              : "Enter your first name"
                          }
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
                          placeholder={
                            role === "company"
                              ? "Representative last name"
                              : "Enter your last name"
                          }
                          value={lastName}
                          onChange={(event) =>
                            setLastName(event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                        
                  {role === "company" && (
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
                    </div>
                  )}
                </>
              )}

              <div className={styles.field}>
                <label htmlFor="email">Email Address</label>

                <div className={styles.inputWrapper}>
                  <EmailIcon />

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div
                className={
                  mode === "signup"
                    ? styles.passwordGrid
                    : styles.singlePassword
                }
              >
                <div className={styles.field}>
                  <label htmlFor="password">Password</label>

                  <div className={styles.inputWrapper}>
                    <LockIcon />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "signup"
                          ? "Create a password"
                          : "Enter your password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />

                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div className={styles.field}>
                    <label htmlFor="confirmPassword">
                      Confirm Password
                    </label>

                    <div className={styles.inputWrapper}>
                      <LockIcon />

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword ? "text" : "password"
                        }
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                      />

                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                    >
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {mode === "signup" && (
                <>
                  <div className={styles.roleSection}>
                    <p>I am registering as a</p>

                    <div className={styles.roleGrid}>
                      <button
                        type="button"
                        className={`${styles.roleCard} ${
                          role === "applicant"
                            ? styles.selectedRole
                            : ""
                        }`}
                        onClick={() => setRole("applicant")}
                      >
                        <span className={styles.radio}>
                          <span></span>
                        </span>

                        <UserIcon />

                        <div>
                          <strong>Applicant</strong>
                          <small>Looking for job opportunities</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`${styles.roleCard} ${
                          role === "company"
                            ? styles.selectedRole
                            : ""
                        }`}
                        onClick={() => setRole("company")}
                      >
                        <span className={styles.radio}>
                          <span></span>
                        </span>

                        <BuildingIcon />

                        <div>
                          <strong>Company Representative</strong>
                          <small>Hiring talent</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  <label className={styles.terms}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) =>
                        setAcceptedTerms(event.target.checked)
                      }
                    />

                    <span>
                      I agree to the <a href="#">Terms of Service</a> and{" "}
                      <a href="#">Privacy Policy</a>
                    </span>
                  </label>
                </>
              )}

              {mode === "login" && (
                <div className={styles.loginOptions}>
                  <label>
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <a href="/auth/forgot-password">Forgot password?</a>
                </div>
              )}

              {message && (
                <div
                  className={`${styles.message} ${
                    messageType === "error"
                      ? styles.errorMessage
                      : styles.successMessage
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                  ? "Create Account"
                  : "Log In"}

                {!loading && <ArrowIcon />}
              </button>
            </form>

            <p className={styles.bottomSwitch}>
              {mode === "signup"
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    mode === "signup" ? "login" : "signup"
                  )
                }
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </button>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

/* ---------------- ICONS ---------------- */

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6" />
      <path d="M15 15c3 0 5 2 5 5" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="10" cy="8" r="3" />
      <path d="M4 20c0-4 2-6 6-6 2 0 3.5.5 4.5 1.5" />
      <path d="M18 12v6M15 15h6" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M10 4H5v16h5" />
      <path d="M13 8l4 4-4 4M8 12h9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c0-5 2.8-8 7-8s7 3 7 8" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a16.6 16.6 0 0 1-3 4.2" />
      <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 8 10 8a10.7 10.7 0 0 0 4.1-.8" />
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}
