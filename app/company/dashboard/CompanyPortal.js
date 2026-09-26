"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import {
  JOB_FIELDS,
  PROFILE_FIELDS,
} from "../../../lib/company/validation.mjs";

const LABELS = {
  company_name: "Company name",
  description: "Company description",
  industry: "Industry",
  address: "Address",
  contact_email: "Contact email",
  contact_phone: "Contact phone",
  website: "Website (optional)",
  job_title: "Job title",
  job_description: "Job description",
  requirements: "Requirements",
  location: "Workplace / work arrangement",
};
const JOB_STATUS = ["Pending", "Approved", "Rejected", "Closed"];
const APPLICATION_STATUS = [
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Hired",
  "Rejected",
];
const INTERVIEW_STATUS = ["Scheduled", "Completed", "Cancelled"];
const EMPTY_JOB = {
  job_title: "",
  job_description: "",
  requirements: "",
  location: "",
  category_id: "",
  employment_type: "Full-time",
};
const dateTime = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
async function readResponse(response) {
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request failed. Please try again.");
  return result;
}
function Badge({ children }) {
  return <span className={styles.statusBadge}>{children}</span>;
}
function Fields({ fields, values, setValues, disabled }) {
  return Object.entries(fields).map(([key, [min, max]]) => (
    <label key={key} className={styles.field}>
      {LABELS[key]} <span aria-hidden="true">*</span>
      {["description", "job_description", "requirements"].includes(key) ? (
        <textarea
          required
          minLength={min}
          maxLength={max}
          rows={5}
          value={values[key] || ""}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          disabled={disabled}
        />
      ) : (
        <input
          required
          type={
            key === "contact_email"
              ? "email"
              : key === "contact_phone"
                ? "tel"
                : "text"
          }
          minLength={min}
          maxLength={max}
          value={values[key] || ""}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          disabled={disabled}
        />
      )}
    </label>
  ));
}
export default function CompanyPortal() {
  const router = useRouter();
  const [overview, setOverview] = useState(null),
    [overviewError, setOverviewError] = useState("");
  const [section, setSection] = useState("jobs"),
    [revision, setRevision] = useState(0);
  const [rows, setRows] = useState([]),
    [contacts, setContacts] = useState([]),
    [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true),
    [listError, setListError] = useState("");
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [jobFilter, setJobFilter] = useState(null);
  const [editor, setEditor] = useState(null),
    [values, setValues] = useState({}),
    [profileValues, setProfileValues] = useState(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const saving = useRef(false),
    editorRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/company", { signal: controller.signal, cache: "no-store" })
      .then(readResponse)
      .then((r) => {
        setOverview(r.data);
        setOverviewError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setOverviewError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (section === "profile") return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      section,
      page: String(page),
      limit: "20",
      status,
      search,
      category,
      job: jobFilter?.id || "",
    });
    fetch(`/api/company?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(readResponse)
      .then((r) => {
        setRows(r.data);
        setContacts(r.contacts || []);
        setCount(r.count);
        setListError("");
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setListError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [section, page, status, search, category, jobFilter, revision]);
  useEffect(() => {
    if (editor) editorRef.current?.focus();
  }, [editor]);

  function refresh() {
    setLoading(true);
    setRevision((r) => r + 1);
  }
  function tab(next) {
    setSection(next);
    setPage(1);
    setStatus("");
    setSearch("");
    setCategory("");
    setJobFilter(null);
    setEditor(null);
    setLoading(true);
    setError("");
    setNotice("");
  }
  function filter(setter, value) {
    setter(value);
    setPage(1);
    setLoading(true);
  }
  function openJob(job) {
    setValues(
      job
        ? Object.fromEntries(
            [...Object.keys(JOB_FIELDS), "category_id", "employment_type"].map(
              (k) => [k, job[k]],
            ),
          )
        : { ...EMPTY_JOB },
    );
    setEditor(job?.job_id || "new");
    setError("");
    setNotice("");
  }
  async function write(action, data = {}, id = null) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await readResponse(
        await fetch("/api/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id, data }),
        }),
      );
      setNotice(
        action === "profile"
          ? "Company profile saved and submitted for review."
          : action === "close_job"
            ? "Job closed. Existing applications are retained."
            : action === "decision"
              ? "Hiring decision recorded."
              : "Job submitted for staff review.",
      );
      setEditor(null);
      if (action === "profile") setProfileValues(null);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await readResponse(
        await fetch("/api/company/logout", { method: "POST" }),
      );
      router.replace("/auth");
      router.refresh();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      saving.current = false;
    }
  }
  const company = overview?.company,
    approved = company?.review_status === "approved";
  const person = (id) => contacts.find((c) => c.user_id === id);
  const name = (id) => {
    const p = person(id);
    return p ? `${p.first_name} ${p.last_name}` : "Applicant";
  };
  const interviewFor = (row) =>
    Array.isArray(row.interviews) ? row.interviews[0] : row.interviews;
  const stats = overview?.stats || [];
  return (
    <main className={styles.dashboardContainer}>
      <nav className={styles.navBar} aria-label="Company portal">
        <div>
          <span className={styles.logoText}>HireLink</span>
          <span className={styles.portalBadge}>Company Portal</span>
        </div>
        <div className={styles.actions}>
          <span>{company?.company_name}</span>
          <button className={styles.secondary} onClick={logout} disabled={busy}>
            Log out
          </button>
        </div>
      </nav>
      <header className={styles.welcomeHero}>
        <h1>
          {company ? `Welcome, ${company.company_name}` : "Company dashboard"}
        </h1>
        <p>
          Manage your jobs, meet your applicants, and follow your recruitment
          activity.
        </p>
      </header>
      {overviewError && (
        <div role="alert" className={styles.error}>
          {overviewError} <button onClick={refresh}>Retry</button>
        </div>
      )}
      {!overview && !overviewError && (
        <p role="status">Loading company details…</p>
      )}
      {company && !approved && (
        <aside className={styles.banner}>
          <strong>
            {company.review_status === "rejected"
              ? "Company profile needs revision"
              : "Company profile awaiting review"}
          </strong>
          <p>
            {company.review_status === "rejected"
              ? "Update your company details and save to resubmit for review."
              : "Staff must approve your company before you can submit job content."}{" "}
            Existing applications and interviews remain available.
          </p>
          <button className={styles.secondary} onClick={() => tab("profile")}>
            Review company profile
          </button>
        </aside>
      )}
      <section className={styles.statsGrid} aria-label="Recruitment totals">
        {[
          "Approved jobs",
          "Total applications",
          "Awaiting staff processing",
          "Scheduled interviews",
        ].map((label, i) => (
          <div className={styles.statCard} key={label}>
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValue}>{overview ? stats[i] : "—"}</div>
          </div>
        ))}
      </section>
      <div className={styles.tabs} aria-label="Dashboard sections">
        {["jobs", "applications", "interviews", "profile"].map((t) => (
          <button
            disabled={busy}
            aria-current={section === t ? "page" : undefined}
            className={section === t ? styles.primary : styles.secondary}
            key={t}
            onClick={() => tab(t)}
          >
            {t === "profile"
              ? "Company profile"
              : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button className={styles.secondary} disabled={busy} onClick={refresh}>
          Refresh
        </button>
      </div>
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {section === "profile" && company && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Company profile</h2>
            <Badge>{company.review_status}</Badge>
          </div>
          <p className={styles.help}>
            Saving changes returns your company to Pending review. Your jobs
            will be hidden from applicants until the company is approved again.
            Fields marked * are required.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const source = profileValues || company;
              write(
                "profile",
                Object.fromEntries(
                  [...Object.keys(PROFILE_FIELDS), "website"].map((k) => [
                    k,
                    source[k] || "",
                  ]),
                ),
              );
            }}
          >
            <div className={styles.formGrid}>
              <Fields
                fields={PROFILE_FIELDS}
                values={profileValues || company}
                setValues={setProfileValues}
                disabled={busy}
              />
              <label className={styles.field}>
                Website (optional)
                <input
                  type="url"
                  placeholder="https://example.com"
                  maxLength={2048}
                  value={(profileValues || company).website || ""}
                  onChange={(e) =>
                    setProfileValues({
                      ...(profileValues || company),
                      website: e.target.value,
                    })
                  }
                  disabled={busy}
                />
              </label>
            </div>
            <button className={styles.primary} disabled={busy}>
              {busy ? "Saving…" : "Save and submit for review"}
            </button>
          </form>
        </section>
      )}
      {section !== "profile" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {section === "jobs"
                ? "Job postings"
                : section === "applications"
                  ? "Applications"
                  : "Interview schedules"}
            </h2>
            {section === "jobs" && (
              <button
                className={styles.primary}
                disabled={!approved || busy}
                onClick={() => openJob(null)}
              >
                Create job
              </button>
            )}
          </div>
          {section === "jobs" && !approved && (
            <p className={styles.help}>
              Job creation and content edits become available after company
              approval. You can still close an existing job.
            </p>
          )}
          {editor && section === "jobs" && (
            <form
              className={styles.editor}
              onSubmit={(e) => {
                e.preventDefault();
                write(
                  editor === "new" ? "create_job" : "edit_job",
                  values,
                  editor === "new" ? null : editor,
                );
              }}
            >
              <h3 ref={editorRef} tabIndex={-1}>
                {editor === "new" ? "Create a job" : "Edit job"}
              </h3>
              <p className={styles.help}>
                All fields are required. Saving sends this job to Pending
                review, including when reopening a closed job.
              </p>
              <div className={styles.formGrid}>
                <Fields
                  fields={JOB_FIELDS}
                  values={values}
                  setValues={setValues}
                  disabled={busy}
                />
                <label className={styles.field}>
                  Category *
                  <select
                    required
                    value={values.category_id}
                    onChange={(e) =>
                      setValues({ ...values, category_id: e.target.value })
                    }
                    disabled={busy}
                  >
                    <option value="">Choose category</option>
                    {overview?.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Employment type *
                  <select
                    required
                    value={values.employment_type}
                    onChange={(e) =>
                      setValues({ ...values, employment_type: e.target.value })
                    }
                    disabled={busy}
                  >
                    {["Full-time", "Part-time", "Contract", "Internship"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className={styles.actions}>
                <button className={styles.primary} disabled={busy || !approved}>
                  {busy ? "Saving…" : "Submit for review"}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className={styles.filters}>
            {section === "jobs" && (
              <>
                <label className={styles.field}>
                  Search job title
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => filter(setSearch, e.target.value)}
                    placeholder="Search your jobs"
                  />
                </label>
                <label className={styles.field}>
                  Category
                  <select
                    value={category}
                    onChange={(e) => filter(setCategory, e.target.value)}
                  >
                    <option value="">All categories</option>
                    {overview?.categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className={styles.field}>
              Status
              <select
                value={status}
                onChange={(e) => filter(setStatus, e.target.value)}
              >
                <option value="">All statuses</option>
                {(section === "jobs"
                  ? JOB_STATUS
                  : section === "applications"
                    ? APPLICATION_STATUS
                    : INTERVIEW_STATUS
                ).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {jobFilter && (
            <p>
              Applications for <strong>{jobFilter.title}</strong>{" "}
              <button
                className={styles.secondary}
                onClick={() => filter(setJobFilter, null)}
              >
                Show all jobs
              </button>
            </p>
          )}
          {section === "interviews" && (
            <p className={styles.help}>
              All times are Philippine time (Asia/Manila). Staff manage
              interview schedules.
            </p>
          )}
          {loading ? (
            <p role="status">Loading {section}…</p>
          ) : listError ? (
            <p role="alert" className={styles.error}>
              {listError} <button onClick={refresh}>Retry</button>
            </p>
          ) : rows.length === 0 ? (
            <div className={styles.empty}>
              <h3>No {section} found</h3>
              <p>
                {section === "jobs"
                  ? "Create your first job or adjust the filters."
                  : section === "applications"
                    ? "Applications to your jobs will appear here."
                    : "Interview schedules will appear after staff arrange them."}
              </p>
            </div>
          ) : (
            rows.map((row) =>
              section === "jobs" ? (
                <article className={styles.jobItem} key={row.job_id}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.jobTitle}>{row.job_title}</h3>
                    <Badge>{row.status}</Badge>
                  </div>
                  <p className={styles.jobDetails}>
                    {row.location} · {row.employment_type} ·{" "}
                    {row.job_categories?.category_name}
                  </p>
                  <details>
                    <summary>Job details</summary>
                    <h4>Description</h4>
                    <p className={styles.multiline}>{row.job_description}</p>
                    <h4>Requirements</h4>
                    <p className={styles.multiline}>{row.requirements}</p>
                    <p className={styles.help}>
                      Submitted {dateTime(row.created_at)}
                    </p>
                  </details>
                  <div className={styles.actions}>
                    <button
                      className={styles.secondary}
                      disabled={busy || !approved}
                      onClick={() => openJob(row)}
                    >
                      {row.status === "Closed" ? "Edit and reopen" : "Edit"}
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={() => {
                        tab("applications");
                        setJobFilter({ id: row.job_id, title: row.job_title });
                      }}
                    >
                      View applications
                    </button>
                    {row.status !== "Closed" && (
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Close “${row.job_title}”? Existing applications will be kept.`,
                            )
                          )
                            write("close_job", {}, row.job_id);
                        }}
                      >
                        Close job
                      </button>
                    )}
                  </div>
                </article>
              ) : section === "applications" ? (
                <article className={styles.jobItem} key={row.application_id}>
                  <div className={styles.cardHeader}>
                    <h3>{name(row.applicant_id)}</h3>
                    <Badge>{row.application_status}</Badge>
                  </div>
                  <p>{row.job_postings.job_title}</p>
                  <p className={styles.help}>
                    Applied {dateTime(row.application_date)}
                  </p>
                  <details>
                    <summary>Applicant details and decision</summary>
                    <p>
                      Email:{" "}
                      {person(row.applicant_id)?.email || "Not available"}
                    </p>
                    <p>
                      Phone: {person(row.applicant_id)?.phone || "Not provided"}
                    </p>
                    <h4>Application note</h4>
                    <p className={styles.multiline}>{row.application_note}</p>
                    {interviewFor(row) ? (
                      <p>
                        Interview: {interviewFor(row).interview_status} ·{" "}
                        {dateTime(interviewFor(row).starts_at)} to{" "}
                        {dateTime(interviewFor(row).ends_at)} (Philippine time)
                        · {interviewFor(row).interview_location}
                      </p>
                    ) : (
                      <p>No interview scheduled.</p>
                    )}
                    {row.application_status === "Shortlisted" &&
                    interviewFor(row)?.interview_status !== "Scheduled" ? (
                      <div className={styles.actions}>
                        {["Hired", "Rejected"].map((decision) => (
                          <button
                            key={decision}
                            className={
                              decision === "Hired"
                                ? styles.primary
                                : styles.secondary
                            }
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Mark ${name(row.applicant_id)} as ${decision}? This decision is final.`,
                                )
                              )
                                write(
                                  "decision",
                                  { application_status: decision },
                                  row.application_id,
                                );
                            }}
                          >
                            Mark {decision}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.help}>
                        {row.application_status === "Shortlisted"
                          ? "Staff must complete or cancel the scheduled interview before a final decision."
                          : ["Hired", "Rejected"].includes(
                                row.application_status,
                              )
                            ? "Final decision recorded."
                            : "Staff must shortlist this application before you can record a final decision."}
                      </p>
                    )}
                  </details>
                </article>
              ) : (
                <article className={styles.jobItem} key={row.interview_id}>
                  <div className={styles.cardHeader}>
                    <h3>{name(row.applications.applicant_id)}</h3>
                    <Badge>{row.interview_status}</Badge>
                  </div>
                  <p>{row.applications.job_postings.job_title}</p>
                  <p>
                    {dateTime(row.starts_at)} – {dateTime(row.ends_at)}
                  </p>
                  <p>Location: {row.interview_location}</p>
                </article>
              ),
            )
          )}
          <div className={styles.pagination}>
            <button
              className={styles.secondary}
              disabled={loading || page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                setLoading(true);
              }}
            >
              Previous
            </button>
            <span>
              Page {page} · {count} records
            </span>
            <button
              className={styles.secondary}
              disabled={loading || page * 20 >= count}
              onClick={() => {
                setPage((p) => p + 1);
                setLoading(true);
              }}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
