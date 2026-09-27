"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPLICATION_STATUSES,
  INTERVIEW_STATUSES,
  EMPLOYMENT_TYPES,
} from "../../../lib/applicant/validation.mjs";
import s from "./dashboard.module.css";

const sections = [
  ["jobs", "Browse jobs", "search"],
  ["applications", "My applications", "folder"],
  ["interviews", "Interviews", "calendar"],
  ["profile", "My profile", "user"],
];
const statusText = {
  Submitted: "Your application has been received. Staff will review it.",
  "Under Review": "Staff are reviewing your application.",
  Shortlisted: "You have been shortlisted. Check Interviews for your schedule.",
  Hired: "Congratulations! Contact the company for your next steps.",
  Rejected:
    "This application was not selected. You can explore other opportunities.",
};
const date = (value, time = false) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
      }).format(new Date(value))
    : "—";
const clock = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
const initials = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "HL";
function Icon({ name, ...props }) {
  const paths = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    folder: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="3" />
        <path d="M8 6V3h8v3M3 12h18M10 12v3h4v-3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    logout: (
      <>
        <path d="M9 4H4v16h5m4-14 6 6-6 6m-5-6h11" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    link: (
      <>
        <path d="M14 3h7v7m0-7L10 14" />
        <path d="M10 4H4v16h16v-6" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.folder}
    </svg>
  );
}
function Badge({ status }) {
  return (
    <span
      className={`${s.badge} ${s["status" + status?.replaceAll(" ", "")] || ""}`}
    >
      {status}
    </span>
  );
}
function Empty({ title, children, icon = "search" }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Pager({ page, count, limit = 12, onChange }) {
  const pages = Math.max(1, Math.ceil(count / limit));
  return (
    <div className={s.pager}>
      <span>
        {count === 0
          ? "No results"
          : `${(page - 1) * limit + 1}–${Math.min(page * limit, count)} of ${count}`}
      </span>
      <div>
        <button
          className={s.secondary}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className={s.secondary}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
async function request(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("We could not reach HireLink. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(
      body.error || "Something went wrong. Please try again.",
    );
    error.code = body.code;
    throw error;
  }
  return body;
}
const write = (action, data) =>
  request("/api/applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
function safeWebsite(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function ApplicantPortal() {
  const router = useRouter();
  const [tab, setTab] = useState("jobs");
  const [overview, setOverview] = useState(null),
    [overviewError, setOverviewError] = useState("");
  const [categories, setCategories] = useState([]),
    [categoryError, setCategoryError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    type: "",
    page: 1,
  });
  const [search, setSearch] = useState("");
  const [appFilters, setAppFilters] = useState({ status: "", page: 1 });
  const [interviewFilters, setInterviewFilters] = useState({
    status: "",
    upcoming: true,
    page: 1,
  });
  const [result, setResult] = useState({ data: [], count: 0, limit: 12 }),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState(""),
    [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState(""),
    [sent, setSent] = useState(false),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const mutation = useRef(false),
    dialog = useRef(null),
    listTitle = useRef(null);
  const profile = overview?.profile;
  const refresh = () => setRevision((v) => v + 1);
  const changeTab = (next) => {
    if (next === tab) refresh();
    setTab(next);
    setNotice("");
    setLoadError("");
    setLoading(true);
  };
  useEffect(() => {
    const controller = new AbortController();
    request("/api/applicant", { signal: controller.signal })
      .then((body) => {
        setOverview(body.data);
        setOverviewError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setOverviewError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let items = [],
        page = 1;
      while (true) {
        const body = await request(`/api/categories?page=${page}&limit=100`, {
          signal: controller.signal,
        });
        items.push(...body.data);
        if (items.length >= body.count || !body.data.length) break;
        page++;
      }
      setCategories(items);
      setCategoryError("");
    }
    load().catch((e) => {
      if (e.name !== "AbortError") setCategoryError(e.message);
    });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (tab === "profile") return;
    const controller = new AbortController();
    const params =
      tab === "jobs"
        ? new URLSearchParams({
            search: filters.search,
            category_id: filters.category,
            employment_type: filters.type,
            page: filters.page,
          })
        : new URLSearchParams({
            section: tab,
            ...(tab === "applications" ? appFilters : interviewFilters),
          });
    request(`${tab === "jobs" ? "/api/jobs" : "/api/applicant"}?${params}`, {
      signal: controller.signal,
    })
      .then((body) => {
        setResult(body);
        setLoadError("");
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [tab, filters, appFilters, interviewFilters, revision]);
  useEffect(() => {
    if (selected) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (selected?.kind !== "job") return;
    const controller = new AbortController();
    request(`/api/jobs/${selected.id}`, { signal: controller.signal })
      .then((body) => {
        setDetail(body.data);
        setDetailLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setDetailError(e.message);
          setDetailLoading(false);
        }
      });
    return () => controller.abort();
  }, [selected]);
  const openJob = (id) => {
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setSaveError("");
    setNote("");
    setSent(false);
    setSelected({ kind: "job", id });
  };
  const openApplication = (app) => {
    setDetail({
      ...app,
      interviews: Array.isArray(app.interviews)
        ? app.interviews
        : app.interviews
          ? [app.interviews]
          : [],
    });
    setDetailError("");
    setSaveError("");
    setDetailLoading(false);
    setSent(false);
    setSelected({ kind: "application", id: app.application_id });
  };
  const closeDialog = () => {
    if (!mutation.current) setSelected(null);
  };
  const updateFilters = (patch) => {
    setLoading(true);
    setFilters((v) => ({ ...v, ...patch, page: 1 }));
  };
  const changePage = (page) => {
    setLoading(true);
    if (tab === "jobs") setFilters((v) => ({ ...v, page }));
    else if (tab === "applications") setAppFilters((v) => ({ ...v, page }));
    else setInterviewFilters((v) => ({ ...v, page }));
    listTitle.current?.focus();
  };
  async function apply(event) {
    event.preventDefault();
    if (mutation.current || !detail) return;
    mutation.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await write("apply", { job_id: detail.job_id, application_note: note });
      setSent(true);
      setDetail((v) => ({ ...v, has_applied: true }));
      refresh();
    } catch (e) {
      setSaveError(e.message);
      if (e.code === "already_applied")
        setDetail((v) => ({ ...v, has_applied: true }));
      if (e.code === "job_unavailable")
        setDetail((v) => ({ ...v, unavailable: true }));
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await request("/api/applicant/logout", { method: "POST" });
      router.replace("/auth");
      router.refresh();
    } catch (e) {
      setNotice(e.message);
      setLoggingOut(false);
    }
  }
  const heading = sections.find((x) => x[0] === tab)?.[1];
  return (
    <div className={s.portal}>
      <a href="#applicant-main" className={s.skip}>
        Skip to content
      </a>
      <aside className={s.sidebar}>
        <a
          className={s.brand}
          href="/applicant/dashboard"
          aria-label="HireLink applicant home"
        >
          <span className={s.brandMark}>
            h<span>l</span>
          </span>
          HireLink<span className={s.brandDot}>.</span>
        </a>
        <div className={s.workspace}>APPLICANT WORKSPACE</div>
        <nav className={s.nav} aria-label="Applicant navigation">
          {sections.map(([key, label, icon]) => (
            <button
              key={key}
              className={tab === key ? s.activeNav : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => changeTab(key)}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {key === "applications" && overview?.application_count > 0 && (
                <small>{overview.application_count}</small>
              )}
            </button>
          ))}
        </nav>
        <div className={s.sidebarTip}>
          <span className={s.tipStar}>✦</span>
          <strong>One step closer.</strong>
          <p>
            A thoughtful application note helps employers understand what you
            bring.
          </p>
        </div>
        <div className={s.account}>
          <span className={s.avatar}>
            {initials(
              (profile?.first_name || "") + " " + (profile?.last_name || ""),
            )}
          </span>
          <div>
            <strong>
              {profile
                ? `${profile.first_name} ${profile.last_name}`
                : "Your account"}
            </strong>
            <small>Applicant</small>
          </div>
        </div>
        <button className={s.logout} disabled={loggingOut} onClick={logout}>
          <Icon name="logout" />
          {loggingOut ? "Signing out…" : "Log out"}
        </button>
      </aside>
      <main id="applicant-main" className={s.main}>
        <header className={s.topbar}>
          <div>
            <span className={s.eyebrow}>YOUR CAREER, YOUR NEXT STEP</span>
            <p>
              Welcome{profile ? `, ${profile.first_name}` : " to HireLink"}{" "}
              <span aria-hidden="true">✦</span>
            </p>
          </div>
          <button
            className={s.accountButton}
            onClick={() => changeTab("profile")}
            aria-label="Open my profile"
          >
            {initials(profile?.first_name || "Applicant")}
          </button>
        </header>
        {notice && (
          <div role="status" className={s.message}>
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              <Icon name="close" />
            </button>
          </div>
        )}
        {overviewError && (
          <div role="alert" className={s.error}>
            {overviewError}{" "}
            <button className={s.textButton} onClick={refresh}>
              Retry
            </button>
          </div>
        )}
        {tab === "jobs" && (
          <>
            <section className={s.hero}>
              <div className={s.heroContent}>
                <span className={s.heroTag}>MAKE YOUR NEXT MOVE</span>
                <h1>
                  Your next chapter
                  <br />
                  starts <em>here.</em>
                </h1>
                <p>
                  Discover opportunities. Meet your future team.
                  <br className={s.desktopBreak} /> Find a role that feels right
                  for you.
                </p>
                <a href="#job-results" className={s.heroLink}>
                  Explore opportunities <Icon name="arrow" />
                </a>
              </div>
              <div className={s.heroArt} aria-hidden="true">
                <div className={s.orbit} />
                <div className={s.orbitTwo} />
                <span className={s.bigStar}>✦</span>
                <span className={s.artCaption}>
                  POSSIBILITY
                  <br />
                  LOOKS GOOD ON YOU.
                </span>
                <div className={s.artCard}>
                  <span>
                    <Icon name="folder" />
                  </span>
                  <div>
                    A fresh start.<small>Your next opportunity awaits.</small>
                  </div>
                  <Icon name="arrow" />
                </div>
              </div>
            </section>
            <section className={s.stats} aria-label="Your overview">
              {[
                [
                  "Available opportunities",
                  overview?.available_count,
                  "search",
                  "jobs",
                ],
                [
                  "Applications sent",
                  overview?.application_count,
                  "folder",
                  "applications",
                ],
                [
                  "Upcoming interviews",
                  overview?.interview_count,
                  "calendar",
                  "interviews",
                ],
              ].map(([label, value, icon, key]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key !== "jobs") changeTab(key);
                    else
                      document
                        .getElementById("job-results")
                        ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={s.statIcon}>
                    <Icon name={icon} />
                  </span>
                  <span>
                    <strong>{value ?? "—"}</strong>
                    <small>{label}</small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </section>
          </>
        )}
        <div className={s.sectionHeading} id="job-results">
          <div>
            <span className={s.eyebrow}>
              {tab === "jobs" ? "FIND YOUR FIT" : "YOUR WORKSPACE"}
            </span>
            <h2 tabIndex={-1} ref={listTitle}>
              {tab === "jobs" ? "Explore opportunities" : heading}
            </h2>
            <p>
              {tab === "jobs"
                ? "Open roles from approved companies. Your next step is up to you."
                : tab === "applications"
                  ? "Every application, and what happens next."
                  : tab === "interviews"
                    ? "Your schedule, all in one place. All times are Philippine time (PHT)."
                    : "Keep your details current so employers can reach you."}
            </p>
          </div>
          <button
            className={s.secondary}
            onClick={() => {
              setLoading(true);
              refresh();
            }}
          >
            Refresh
          </button>
        </div>
        {tab === "profile" ? (
          <>
            {profile ? (
              <ProfileForm
                profile={profile}
                onSaved={(updated) => {
                  setOverview((v) => ({
                    ...v,
                    profile: { ...v.profile, ...updated },
                  }));
                  setNotice("Your profile has been updated.");
                  refresh();
                }}
              />
            ) : !overviewError ? (
              <div className={s.loading} role="status">
                Loading your profile…
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className={s.filters}>
              {tab === "jobs" ? (
                <>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateFilters({ search: search.trim() });
                    }}
                    className={s.searchForm}
                  >
                    <Icon name="search" />
                    <input
                      aria-label="Search jobs"
                      placeholder="Job title, company or location"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      maxLength={100}
                    />
                    <button className={s.primary} type="submit">
                      Search
                    </button>
                  </form>
                  <select
                    aria-label="Job category"
                    value={filters.category}
                    onChange={(e) =>
                      updateFilters({ category: e.target.value })
                    }
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Employment type"
                    value={filters.type}
                    onChange={(e) => updateFilters({ type: e.target.value })}
                  >
                    <option value="">All job types</option>
                    {EMPLOYMENT_TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  {(filters.search || filters.category || filters.type) && (
                    <button
                      className={s.textButton}
                      onClick={() => {
                        setSearch("");
                        updateFilters({ search: "", category: "", type: "" });
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </>
              ) : tab === "applications" ? (
                <label>
                  Application status
                  <select
                    aria-label="Application status"
                    value={appFilters.status}
                    onChange={(e) => {
                      setLoading(true);
                      setAppFilters({ status: e.target.value, page: 1 });
                    }}
                  >
                    <option value="">All statuses</option>
                    {APPLICATION_STATUSES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <div className={s.toggle}>
                    <button
                      aria-pressed={interviewFilters.upcoming}
                      onClick={() => {
                        setLoading(true);
                        setInterviewFilters({
                          upcoming: true,
                          status: "",
                          page: 1,
                        });
                      }}
                    >
                      Upcoming
                    </button>
                    <button
                      aria-pressed={!interviewFilters.upcoming}
                      onClick={() => {
                        setLoading(true);
                        setInterviewFilters({
                          upcoming: false,
                          status: "",
                          page: 1,
                        });
                      }}
                    >
                      All interviews
                    </button>
                  </div>
                  {!interviewFilters.upcoming && (
                    <select
                      aria-label="Interview status"
                      value={interviewFilters.status}
                      onChange={(e) => {
                        setLoading(true);
                        setInterviewFilters((v) => ({
                          ...v,
                          status: e.target.value,
                          page: 1,
                        }));
                      }}
                    >
                      <option value="">All statuses</option>
                      {INTERVIEW_STATUSES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  )}
                  <span className={s.filterHint}>
                    Schedules are managed by staff.
                  </span>
                </>
              )}
            </div>
            {tab === "jobs" && categoryError && (
              <div className={s.error}>
                Categories could not be loaded. You can still search jobs.{" "}
                <button onClick={refresh} className={s.textButton}>
                  Retry
                </button>
              </div>
            )}
            <div className={tab === "jobs" ? s.browseLayout : ""}>
              <section
                className={s.results}
                aria-label={heading}
                aria-busy={loading}
              >
                {loading ? (
                  <div className={s.skeletonGrid} role="status">
                    <span className={s.srOnly}>
                      Loading {heading.toLowerCase()}…
                    </span>
                    {[1, 2, 3, 4].map((x) => (
                      <div className={s.skeleton} key={x}>
                        <span />
                        <span />
                        <span />
                      </div>
                    ))}
                  </div>
                ) : loadError ? (
                  <div className={s.error} role="alert">
                    {loadError}
                    <button
                      className={s.secondary}
                      onClick={() => {
                        setLoading(true);
                        refresh();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    {!result.data.length ? (
                      <Empty
                        title={
                          tab === "jobs"
                            ? "No opportunities found"
                            : tab === "applications"
                              ? "No applications here yet"
                              : "No interviews to show"
                        }
                        icon={tab === "interviews" ? "calendar" : "search"}
                      >
                        {tab === "jobs"
                          ? "Try a different search or clear your filters. New opportunities will appear here when approved."
                          : tab === "applications"
                            ? "Browse available jobs and send an application, or try a different status filter."
                            : "When staff schedule an interview, you’ll find the time and location here."}
                        {tab === "applications" && (
                          <button
                            className={s.primary}
                            onClick={() => changeTab("jobs")}
                          >
                            Browse jobs <Icon name="arrow" />
                          </button>
                        )}
                      </Empty>
                    ) : tab === "jobs" ? (
                      <div className={s.jobGrid}>
                        {result.data.map((job) => (
                          <article className={s.jobCard} key={job.job_id}>
                            <div className={s.cardTop}>
                              <span className={s.companyLogo}>
                                {initials(job.company?.company_name)}
                              </span>
                              <span className={s.typeTag}>
                                {job.employment_type}
                              </span>
                            </div>
                            <span className={s.companyName}>
                              {job.company?.company_name}
                            </span>
                            <h3>
                              <button onClick={() => openJob(job.job_id)}>
                                {job.job_title}
                              </button>
                            </h3>
                            <p className={s.location}>
                              <Icon name="pin" />
                              {job.location}
                            </p>
                            <p className={s.jobExcerpt}>
                              {job.job_description}
                            </p>
                            <div className={s.cardTags}>
                              {job.category_name && (
                                <span>{job.category_name}</span>
                              )}
                              {job.has_applied && (
                                <span className={s.applied}>
                                  <Icon name="check" />
                                  Applied
                                </span>
                              )}
                            </div>
                            <div className={s.cardBottom}>
                              <span>Posted {date(job.created_at)}</span>
                              <button
                                className={s.textButton}
                                onClick={() => openJob(job.job_id)}
                                aria-label={`View ${job.job_title} at ${job.company?.company_name}`}
                              >
                                View role <Icon name="arrow" />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : tab === "applications" ? (
                      <div className={s.applicationList}>
                        {result.data.map((app) => (
                          <article
                            className={s.applicationCard}
                            key={app.application_id}
                          >
                            <span className={s.companyLogo}>
                              {initials(app.job?.company?.company_name)}
                            </span>
                            <div className={s.applicationInfo}>
                              <span className={s.companyName}>
                                {app.job?.company?.company_name}
                              </span>
                              <h3>{app.job?.job_title}</h3>
                              <p>
                                Applied {date(app.application_date)}{" "}
                                <span>·</span> {app.job?.location}
                              </p>
                              <p className={s.statusDescription}>
                                {statusText[app.application_status]}
                              </p>
                            </div>
                            <div className={s.applicationActions}>
                              <Badge status={app.application_status} />
                              <button
                                className={s.textButton}
                                onClick={() => openApplication(app)}
                              >
                                View application <Icon name="arrow" />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className={s.interviewGrid}>
                        {result.data.map((item) => (
                          <InterviewCard
                            key={item.interview_id}
                            interview={item}
                          />
                        ))}
                      </div>
                    )}
                    <Pager
                      page={
                        tab === "jobs"
                          ? filters.page
                          : tab === "applications"
                            ? appFilters.page
                            : interviewFilters.page
                      }
                      count={result.count}
                      limit={result.limit}
                      onChange={changePage}
                    />
                  </>
                )}
              </section>
              {tab === "jobs" && (
                <aside className={s.browseAside}>
                  <div className={s.nextInterview}>
                    <span className={s.asideIcon}>
                      <Icon name="calendar" />
                    </span>
                    <h3>Your next conversation</h3>
                    {overview?.next_interview ? (
                      <>
                        <strong>
                          {overview.next_interview.application?.job?.job_title}
                        </strong>
                        <p>
                          {
                            overview.next_interview.application?.job?.company
                              ?.company_name
                          }
                        </p>
                        <p>
                          {date(overview.next_interview.starts_at, true)} PHT
                        </p>
                        <button
                          className={s.textButton}
                          onClick={() => changeTab("interviews")}
                        >
                          View interview <Icon name="arrow" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          {overview
                            ? "No upcoming interviews yet. Apply to a role you like and check back for updates."
                            : "Your upcoming interview will appear here."}
                        </p>
                        <span className={s.asideRule} />
                        <small>Every application is a new possibility.</small>
                      </>
                    )}
                  </div>
                  <div className={s.profileTip}>
                    <Icon name="user" />
                    <h3>Be easy to reach</h3>
                    <p>
                      Keep your name and phone number up to date before you
                      apply.
                    </p>
                    <button
                      className={s.textButton}
                      onClick={() => changeTab("profile")}
                    >
                      Review my profile <Icon name="arrow" />
                    </button>
                  </div>
                </aside>
              )}
            </div>
          </>
        )}
        <footer className={s.footer}>
          <span>
            HireLink <span>·</span> Connecting people with possibility.
          </span>
          <span>Applicant workspace</span>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby="detail-title"
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) closeDialog();
        }}
      >
        <div className={s.dialogInner}>
          <button
            className={s.close}
            onClick={closeDialog}
            disabled={saving}
            aria-label="Close details"
          >
            <Icon name="close" />
          </button>
          {detailLoading ? (
            <div className={s.loading} role="status">
              <h2 id="detail-title">Loading job details…</h2>
            </div>
          ) : detailError ? (
            <div className={s.empty}>
              <h2 id="detail-title">This role isn’t available</h2>
              <p role="alert">{detailError}</p>
              <button className={s.primary} onClick={closeDialog}>
                Back to opportunities
              </button>
            </div>
          ) : selected?.kind === "job" && detail ? (
            <>
              {sent ? (
                <div className={s.successPanel} role="status">
                  <span>
                    <Icon name="check" width="32" height="32" />
                  </span>
                  <span className={s.eyebrow}>YOU TOOK THE NEXT STEP</span>
                  <h2 id="detail-title">Application sent!</h2>
                  <p>
                    Your application for <strong>{detail.job_title}</strong> at{" "}
                    {detail.company?.company_name} is now submitted.
                  </p>
                  <p>
                    Follow its progress in My applications. Interview details
                    will appear when scheduled by staff.
                  </p>
                  <button
                    className={s.primary}
                    onClick={() => {
                      closeDialog();
                      setAppFilters({ status: "", page: 1 });
                      changeTab("applications");
                    }}
                  >
                    Track my application <Icon name="arrow" />
                  </button>
                  <button className={s.textButton} onClick={closeDialog}>
                    Keep exploring
                  </button>
                </div>
              ) : (
                <>
                  <div className={s.detailHeader}>
                    <span className={s.companyLogo}>
                      {initials(detail.company?.company_name)}
                    </span>
                    <span className={s.companyName}>
                      {detail.company?.company_name}
                    </span>
                    <h2 id="detail-title">{detail.job_title}</h2>
                    <div className={s.detailTags}>
                      <span>
                        <Icon name="pin" />
                        {detail.location}
                      </span>
                      <span>{detail.employment_type}</span>
                      {detail.category_name && (
                        <span>{detail.category_name}</span>
                      )}
                    </div>
                    <p>Posted {date(detail.created_at)}</p>
                  </div>
                  <div className={s.detailSection}>
                    <h3>About the role</h3>
                    <p className={s.preserve}>{detail.job_description}</p>
                    <h3>What you’ll bring</h3>
                    <p className={s.preserve}>{detail.requirements}</p>
                    <h3>About {detail.company?.company_name}</h3>
                    <p className={s.preserve}>{detail.company?.description}</p>
                    <p className={s.muted}>
                      {detail.company?.industry} · {detail.company?.address}
                    </p>
                    {safeWebsite(detail.company?.website) && (
                      <a
                        className={s.textButton}
                        href={safeWebsite(detail.company.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Company website <Icon name="link" />
                      </a>
                    )}
                  </div>
                  <div className={s.applyPanel}>
                    {saveError && (
                      <p className={s.error} role="alert">
                        {saveError}
                      </p>
                    )}
                    {detail.has_applied ? (
                      <>
                        <h3>
                          <Icon name="check" /> You’ve applied to this role
                        </h3>
                        <p>
                          Your application is saved. Check its progress in your
                          workspace.
                        </p>
                        <button
                          className={s.primary}
                          onClick={() => {
                            closeDialog();
                            setAppFilters({ status: "", page: 1 });
                            changeTab("applications");
                          }}
                        >
                          Go to my applications
                        </button>
                      </>
                    ) : detail.unavailable ? (
                      <p>This role is no longer accepting applications.</p>
                    ) : (
                      <form onSubmit={apply}>
                        <h3>Make your introduction</h3>
                        <p>
                          Applying as{" "}
                          <strong>
                            {profile
                              ? `${profile.first_name} ${profile.last_name}`
                              : "your applicant account"}
                          </strong>
                          {profile?.email && <> · {profile.email}</>}
                          {profile?.phone && <> · {profile.phone}</>}
                        </p>
                        <label htmlFor="application-note">
                          Application note <span>(required)</span>
                        </label>
                        <textarea
                          id="application-note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Introduce yourself and share why you’re interested in this role. Highlight the skills or experience you would bring."
                          rows={6}
                          maxLength={2000}
                          required
                          disabled={saving}
                        />
                        <div className={s.noteHelp}>
                          <span>
                            Only one application per role. Review your note
                            before sending; it cannot be edited after
                            submission.
                          </span>
                          <span>{note.length.toLocaleString()}/2,000</span>
                        </div>
                        <button
                          className={s.primary}
                          disabled={saving || !note.trim()}
                          type="submit"
                        >
                          {saving ? "Sending application…" : "Send application"}
                          <Icon name="arrow" />
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </>
          ) : selected?.kind === "application" && detail ? (
            <>
              <div className={s.detailHeader}>
                <span className={s.eyebrow}>YOUR APPLICATION</span>
                <h2 id="detail-title">{detail.job?.job_title}</h2>
                <p>{detail.job?.company?.company_name}</p>
                <Badge status={detail.application_status} />
                <p>{statusText[detail.application_status]}</p>
              </div>
              <div className={s.detailSection}>
                <p className={s.muted}>
                  Submitted {date(detail.application_date, true)} PHT
                </p>
                <h3>Your application note</h3>
                <p className={s.savedNote}>{detail.application_note}</p>
                <h3>Role details</h3>
                <p>
                  {detail.job?.location} · {detail.job?.employment_type}
                </p>
                {detail.job?.status !== "Approved" && (
                  <p className={s.muted}>
                    This listing is currently{" "}
                    {detail.job?.status?.toLowerCase()}. Your application
                    remains available here.
                  </p>
                )}
                <p className={s.preserve}>{detail.job?.job_description}</p>
                <h3>Requirements</h3>
                <p className={s.preserve}>{detail.job?.requirements}</p>
                {detail.interviews?.length > 0 && (
                  <>
                    <h3>Interview</h3>
                    {detail.interviews.map((item) => (
                      <InterviewCard
                        key={item.interview_id}
                        interview={{
                          ...item,
                          application: { job: detail.job },
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <h2 id="detail-title" className={s.srOnly}>
              Details
            </h2>
          )}
        </div>
      </dialog>
    </div>
  );
}

function InterviewCard({ interview }) {
  const job = interview.application?.job,
    company = job?.company;
  return (
    <article className={s.interviewCard}>
      <div className={s.interviewTop}>
        <span className={s.dateTile}>
          <Icon name="calendar" />
          {new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            day: "numeric",
            month: "short",
          }).format(new Date(interview.starts_at))}
        </span>
        <Badge status={interview.interview_status} />
      </div>
      <span className={s.companyName}>{company?.company_name}</span>
      <h3>{job?.job_title}</h3>
      <div className={s.scheduleDetails}>
        <p>
          <Icon name="calendar" />
          <span>
            {date(interview.starts_at)}
            <strong>
              {clock(interview.starts_at)} –{" "}
              {date(interview.starts_at) === date(interview.ends_at)
                ? clock(interview.ends_at)
                : date(interview.ends_at, true)}{" "}
              PHT
            </strong>
          </span>
        </p>
        <p>
          <Icon name="pin" />
          <span>{interview.interview_location}</span>
        </p>
      </div>
      {interview.interview_status === "Cancelled" ? (
        <p className={s.muted}>
          This interview was cancelled. Check here for any schedule updates.
        </p>
      ) : interview.interview_status === "Completed" ? (
        <p className={s.muted}>
          Interview completed. Follow your application for the next update.
        </p>
      ) : (
        <p className={s.muted}>
          {new Date(interview.ends_at) < new Date()
            ? "This scheduled time has passed. Staff have not yet updated its status."
            : "Please be ready a few minutes before your scheduled time."}
        </p>
      )}
      {company?.contact_email && (
        <div className={s.interviewContact}>
          <span>Questions about your interview?</span>
          <a href={`mailto:${company.contact_email}`}>
            {company.contact_email}
          </a>
          {company.contact_phone && (
            <a href={`tel:${company.contact_phone.replace(/[^+0-9]/g, "")}`}>
              {company.contact_phone}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function ProfileForm({ profile, onSaved }) {
  const [draft, setDraft] = useState({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const changed = ["first_name", "last_name", "phone"].some(
    (key) => draft[key].trim() !== (profile[key] || ""),
  );
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = await write("profile", draft);
      const updated = body.data || draft;
      setDraft({
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone: updated.phone || "",
      });
      onSaved(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={s.profileLayout}>
      <form onSubmit={submit} className={s.profileForm}>
        <div className={s.profileHeading}>
          <span className={s.largeAvatar}>
            {initials(profile.first_name + " " + profile.last_name)}
          </span>
          <div>
            <h3>Personal information</h3>
            <p>This is how you appear to employers and staff.</p>
          </div>
        </div>
        {error && (
          <div className={s.error} role="alert">
            {error}
          </div>
        )}
        <div className={s.nameFields}>
          {[
            ["first_name", "First name"],
            ["last_name", "Last name"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                autoComplete={
                  key === "first_name" ? "given-name" : "family-name"
                }
                value={draft[key]}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, [key]: e.target.value }))
                }
                required
                minLength={2}
                maxLength={100}
                disabled={busy}
              />
            </label>
          ))}
        </div>
        <label>
          Email address
          <input
            type="email"
            value={profile.email}
            readOnly
            aria-describedby="email-help"
          />
          <small id="email-help">
            Your sign-in email is managed through your account and cannot be
            changed here.
          </small>
        </label>
        <label>
          Phone number <span>(optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="e.g. +63 917 123 4567"
            value={draft.phone}
            maxLength={30}
            onChange={(e) => setDraft((v) => ({ ...v, phone: e.target.value }))}
            disabled={busy}
          />
          <small>Use a number where a company can reach you.</small>
        </label>
        <div className={s.formFooter}>
          <span>
            Your email and phone are shared with the companies you apply to and
            authorized staff.
          </span>
          <button className={s.primary} disabled={busy || !changed}>
            {busy ? "Saving…" : "Save changes"}
            <Icon name="check" />
          </button>
        </div>
      </form>
      <aside className={s.profileAside}>
        <span className={s.tipStar}>✦</span>
        <h3>A good introduction starts with you.</h3>
        <p>
          Use your real name and keep your contact details current. When you
          apply, share what interests you about the role in your application
          note.
        </p>
        <div>
          <Icon name="folder" />
          <p>
            No résumé upload is required. Your application note is your
            introduction.
          </p>
        </div>
      </aside>
    </div>
  );
}
