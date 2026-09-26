"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  APPLICATION_NEXT,
  interviewSnapshot,
  philippineInput,
  philippineISO,
} from "../../../lib/staff/validation.mjs";
import styles from "./dashboard.module.css";

const STATUS = {
  companies: ["pending", "approved", "rejected"],
  jobs: ["Pending", "Approved", "Rejected", "Closed"],
  applications: [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Hired",
    "Rejected",
  ],
  interviews: ["Scheduled", "Completed", "Cancelled"],
};
const DEFAULT = {
  companies: "pending",
  jobs: "Pending",
  applications: "Submitted",
  interviews: "Scheduled",
};
const label = (value) => (value ? value[0].toUpperCase() + value.slice(1) : "");
const fullName = (person) =>
  person ? `${person.first_name} ${person.last_name}` : "Not available";
const date = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
const interviewOf = (app) =>
  Array.isArray(app.interviews) ? app.interviews[0] : app.interviews;
async function responseJSON(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Unable to read the response. Please try again.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function Badge({ children }) {
  return <span className={styles.badge}>{label(children)}</span>;
}
function ApplicationDetails({ app }) {
  const interview = interviewOf(app);
  return (
    <>
      <p>
        <strong>{fullName(app.applicant)}</strong> · {app.job?.job_title}
      </p>
      <p className={styles.help}>{app.job?.company?.company_name}</p>
      <p>Email: {app.applicant?.email || "Not available"}</p>
      <p>Phone: {app.applicant?.phone || "Not provided"}</p>
      {app.applicant?.is_active === false && (
        <p className={styles.warning}>This applicant account is inactive.</p>
      )}
      <h4>Application note</h4>
      <p className={styles.multiline}>{app.application_note}</p>
      <p>
        Status: <Badge>{app.application_status}</Badge>
      </p>
      {interview ? (
        <p>
          Interview: {interview.interview_status} · {date(interview.starts_at)}{" "}
          – {date(interview.ends_at)} · {interview.interview_location}{" "}
          (Philippine time)
        </p>
      ) : (
        <p>No interview arranged yet.</p>
      )}
    </>
  );
}
export default function StaffPortal() {
  const router = useRouter(),
    dialog = useRef(null),
    saving = useRef(false);
  const [overview, setOverview] = useState(null),
    [overviewError, setOverviewError] = useState("");
  const [section, setSection] = useState("companies"),
    [status, setStatus] = useState("pending"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [mine, setMine] = useState(false);
  const [rows, setRows] = useState([]),
    [count, setCount] = useState(0),
    [loading, setLoading] = useState(true),
    [listError, setListError] = useState(""),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [nextStatus, setNextStatus] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [schedule, setSchedule] = useState({});
  const [assignees, setAssignees] = useState([]),
    [hostsError, setHostsError] = useState(""),
    [hostsLoading, setHostsLoading] = useState(false);
  const profileId = overview?.profile?.user_id;
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/staff", { cache: "no-store", signal: abort.signal })
      .then(responseJSON)
      .then((r) => {
        setOverview(r.data);
        setOverviewError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setOverviewError(e.message);
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({
      section,
      status,
      search,
      page: String(page),
      limit: "20",
    });
    if (mine && profileId) params.set("host", profileId);
    fetch(`/api/staff?${params}`, { cache: "no-store", signal: abort.signal })
      .then(responseJSON)
      .then((r) => {
        setRows(r.data);
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
    return () => abort.abort();
  }, [
    section,
    status,
    search,
    page,
    mine,
    profileId,
    revision,
  ]);
  useEffect(() => {
    if (selected) {
      if (!dialog.current.open) dialog.current.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => {
    if (selected?.kind !== "schedule") return;
    const abort = new AbortController();
    async function load() {
      try {
        const all = [];
        let current = 1,
          total = 1;
        while (all.length < total) {
          const r = await fetch(
            `/api/staff?section=assignees&page=${current}&limit=100`,
            { cache: "no-store", signal: abort.signal },
          ).then(responseJSON);
          all.push(...r.data);
          total = r.count;
          if (!r.data.length) break;
          current++;
        }
        setAssignees(all);
        setHostsError("");
        setHostsLoading(false);
      } catch (e) {
        if (e.name !== "AbortError") {
          setHostsError(e.message);
          setHostsLoading(false);
        }
      }
    }
    load();
    return () => abort.abort();
  }, [selected]);
  function refresh() {
    setLoading(true);
    setRevision((r) => r + 1);
  }
  function tab(value) {
    setSection(value);
    setStatus(DEFAULT[value]);
    setSearch("");
    setPage(1);
    setMine(false);
    setLoading(true);
    setError("");
    setNotice("");
  }
  function filter(setter, value) {
    setter(value);
    setPage(1);
    setLoading(true);
  }
  function open(kind, row) {
    setSelected({ kind, row });
    setNextStatus("");
    setConfirmed(false);
    setError("");
    setNotice("");
  }
  function openSchedule(app, interview) {
    setSchedule({
      staff_id: interview?.staff_id || overview?.profile?.user_id || "",
      starts_at: philippineInput(interview?.starts_at),
      ends_at: philippineInput(interview?.ends_at),
      interview_location: interview?.interview_location || "",
    });
    setHostsLoading(true);
    setHostsError("");
    setAssignees([]);
    setSelected({
      kind: "schedule",
      row: app,
      interview: interviewSnapshot(interview),
    });
    setError("");
    setNotice("");
  }
  async function write(action, id, data, success) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, data }),
      }).then(responseJSON);
      setSelected(null);
      setNotice(success);
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
      await fetch("/api/staff/logout", { method: "POST" }).then(responseJSON);
      router.replace("/auth");
      router.refresh();
    } catch (e) {
      setError(e.message);
      saving.current = false;
      setBusy(false);
    }
  }
  function review(target) {
    const row = selected.row,
      company = selected.kind === "company";
    if (
      window.confirm(
        `${label(target)} ${company ? row.company_name : row.job_title}?`,
      )
    )
      write(
        company ? "review_company" : "review_job",
        company ? row.user_id : row.job_id,
        { status: target, expected_updated_at: row.updated_at },
        `${company ? "Company" : "Job"} ${target}.`,
      );
  }
  function finishInterview(row, target) {
    if (window.confirm(`Mark this interview ${target}?`))
      write(
        "interview_status",
        row.interview_id,
        { status: target, expected_interview: interviewSnapshot(row) },
        `Interview marked ${target}.`,
      );
  }
  const profile = overview?.profile;
  return (
    <main className={styles.dashboardContainer}>
      <nav className={styles.navBar} aria-label="Staff navigation">
        <div>
          <span className={styles.logoText}>HireLink</span>
          <span className={styles.portalBadge}>Staff Portal</span>
        </div>
        <div className={styles.actions}>
          <span>
            {profile
              ? `${fullName(profile)} (${label(profile.role)})`
              : "Staff workspace"}
          </span>
          {profile?.role === "admin" && (
            <Link className={styles.secondary} href="/admin/dashboard">
              Admin dashboard
            </Link>
          )}
          <button className={styles.secondary} onClick={logout} disabled={busy}>
            Log out
          </button>
        </div>
      </nav>
      <header className={styles.welcomeHero}>
        <h1>System Review Workspace</h1>
        <p>
          Review companies and jobs, process applications, and arrange
          interviews for the job fair.
        </p>
      </header>
      {overviewError && (
        <p className={styles.error} role="alert">
          {overviewError} <button onClick={refresh}>Retry</button>
        </p>
      )}
      <section className={styles.statsGrid} aria-label="Staff work totals">
        {[
          "Pending companies",
          "Pending jobs",
          "Open applications",
          "Scheduled interviews",
        ].map((title, i) => (
          <div className={styles.statCard} key={title}>
            <span>{title}</span>
            <strong>{overview ? overview.stats[i] : "—"}</strong>
          </div>
        ))}
      </section>
      <nav className={styles.tabsContainer} aria-label="Staff sections">
        {Object.keys(STATUS).map((s) => (
          <button
            key={s}
            className={`${styles.tabButton} ${section === s ? styles.tabButtonActive : ""}`}
            aria-current={section === s ? "page" : undefined}
            onClick={() => tab(s)}
            disabled={busy}
          >
            {label(s)}
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {error && !selected && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>
            {section === "companies"
              ? "Company reviews"
              : section === "jobs"
                ? "Job reviews"
                : section === "applications"
                  ? "Applications"
                  : "Interview schedules"}
          </h2>
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
        <div className={styles.filters}>
          <label className={styles.field}>
            {section === "companies"
              ? "Search company"
              : section === "interviews"
                ? "Search location"
                : "Search job title"}
            <input
              type="search"
              maxLength={100}
              value={search}
              onChange={(e) => filter(setSearch, e.target.value)}
              placeholder="Type to search"
            />
          </label>
          <label className={styles.field}>
            Status
            <select
              value={status}
              onChange={(e) => filter(setStatus, e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS[section].map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          {section === "interviews" && (
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={mine}
                onChange={(e) => filter(setMine, e.target.checked)}
              />
              Assigned to me
            </label>
          )}
        </div>
        <p className={styles.help}>
          {section === "companies"
            ? "Open a company to check its details before approving or rejecting it."
            : section === "jobs"
              ? "Only Pending jobs can be reviewed. Approval requires an approved, active company."
              : section === "applications"
                ? "Move applications through staff review and shortlisting. Record hiring decisions with company confirmation."
                : "All times are Philippine time (Asia/Manila). Back-to-back interviews are allowed; overlapping schedules are blocked."}
        </p>
        {loading ? (
          <p role="status" className={styles.empty}>
            Loading {section}…
          </p>
        ) : listError ? (
          <p role="alert" className={styles.error}>
            {listError} <button onClick={refresh}>Retry</button>
          </p>
        ) : !rows.length ? (
          <div className={styles.empty}>
            <h3>No {section} found</h3>
            <p>There are no records matching these filters.</p>
          </div>
        ) : section === "companies" ? (
          rows.map((row) => (
            <article key={row.user_id} className={styles.record}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>{row.company_name}</h3>
                  <p className={styles.help}>
                    {row.industry} · {row.address}
                  </p>
                </div>
                <Badge>{row.review_status}</Badge>
              </div>
              <p className={styles.preview}>{row.description}</p>
              <div className={styles.actions}>
                <button
                  className={styles.actionButtonPrimary}
                  onClick={() => open("company", row)}
                >
                  View and review
                </button>
                {row.representative?.is_active === false && (
                  <span className={styles.help}>Inactive company account</span>
                )}
              </div>
            </article>
          ))
        ) : section === "jobs" ? (
          rows.map((row) => (
            <article key={row.job_id} className={styles.record}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>{row.company?.company_name}</p>
                  <h3>{row.job_title}</h3>
                  <p className={styles.help}>
                    {row.location} · {row.employment_type} ·{" "}
                    {row.job_categories?.category_name}
                  </p>
                </div>
                <Badge>{row.status}</Badge>
              </div>
              <p className={styles.preview}>{row.job_description}</p>
              <div className={styles.actions}>
                <button
                  className={styles.actionButtonPrimary}
                  onClick={() => open("job", row)}
                >
                  View and review
                </button>
                {row.company?.review_status !== "approved" && (
                  <span className={styles.help}>Company awaiting approval</span>
                )}
              </div>
            </article>
          ))
        ) : section === "applications" ? (
          <div className={styles.tableWrapper}>
            <table className={styles.dashboardTable}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job / company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.application_id}>
                    <td>
                      <strong>{fullName(row.applicant)}</strong>
                      <p className={styles.help}>
                        {date(row.application_date)}
                      </p>
                    </td>
                    <td>
                      {row.job?.job_title}
                      <p className={styles.help}>
                        {row.job?.company?.company_name}
                      </p>
                    </td>
                    <td>
                      <Badge>{row.application_status}</Badge>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButtonPrimary}
                          onClick={() => open("application", row)}
                        >
                          Review
                        </button>
                        {row.application_status === "Shortlisted" &&
                          interviewOf(row)?.interview_status !==
                            "Completed" && (
                            <button
                              className={styles.actionButtonSchedule}
                              onClick={() =>
                                openSchedule(row, interviewOf(row))
                              }
                            >
                              {interviewOf(row) ? "Reschedule" : "Schedule"}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          rows.map((row) => (
            <article key={row.interview_id} className={styles.record}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>{fullName(row.application?.applicant)}</h3>
                  <p>
                    {row.application?.job?.job_title} ·{" "}
                    {row.application?.job?.company?.company_name}
                  </p>
                </div>
                <Badge>{row.interview_status}</Badge>
              </div>
              <p className={styles.time}>
                {date(row.starts_at)} – {date(row.ends_at)}
              </p>
              <p>Location: {row.interview_location}</p>
              <p>
                Assigned to: {fullName(row.host)}
                {row.host?.is_active === false ? " (inactive)" : ""}
              </p>
              <div className={styles.actions}>
                {row.interview_status !== "Completed" &&
                  row.application?.application_status === "Shortlisted" && (
                    <button
                      className={styles.actionButtonSchedule}
                      disabled={busy}
                      onClick={() => openSchedule(row.application, row)}
                    >
                      Reschedule
                    </button>
                  )}
                {row.interview_status === "Scheduled" && (
                  <>
                    <button
                      className={styles.actionButtonPrimary}
                      disabled={busy}
                      onClick={() => finishInterview(row, "Completed")}
                    >
                      Mark completed
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => finishInterview(row, "Cancelled")}
                    >
                      Cancel interview
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
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
      <dialog
        ref={dialog}
        className={styles.modalContent}
        aria-labelledby="staff-dialog-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSelected(null);
        }}
      >
        {selected && (
          <>
            <div className={styles.cardHeader}>
              <h2 id="staff-dialog-title">
                {selected.kind === "company"
                  ? "Company review"
                  : selected.kind === "job"
                    ? "Job review"
                    : selected.kind === "application"
                      ? "Application review"
                      : selected.interview
                        ? "Reschedule interview"
                        : "Arrange interview"}
              </h2>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() => setSelected(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.dialogBody}>
              {selected.kind === "company" && (
                <>
                  <h3>{selected.row.company_name}</h3>
                  <Badge>{selected.row.review_status}</Badge>
                  <p className={styles.multiline}>{selected.row.description}</p>
                  <p>Industry: {selected.row.industry}</p>
                  <p>Address: {selected.row.address}</p>
                  <p>Company email: {selected.row.contact_email}</p>
                  <p>Company phone: {selected.row.contact_phone}</p>
                  <p>Website: {selected.row.website || "Not provided"}</p>
                  <p>Representative: {fullName(selected.row.representative)}</p>
                  <p>
                    Account email:{" "}
                    {selected.row.representative?.email || "Not available"}
                  </p>
                  <p>Submitted: {date(selected.row.created_at)}</p>
                  {selected.row.review_status === "pending" ? (
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButtonPrimary}
                        disabled={
                          busy ||
                          selected.row.representative?.is_active === false
                        }
                        onClick={() => review("approved")}
                      >
                        Approve company
                      </button>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => review("rejected")}
                      >
                        Reject company
                      </button>
                    </div>
                  ) : (
                    <p className={styles.help}>
                      This company has already been reviewed. Profile edits
                      return it to Pending.
                    </p>
                  )}
                </>
              )}
              {selected.kind === "job" && (
                <>
                  <p className={styles.eyebrow}>
                    {selected.row.company?.company_name}
                  </p>
                  <h3>{selected.row.job_title}</h3>
                  <Badge>{selected.row.status}</Badge>
                  <p>
                    {selected.row.location} · {selected.row.employment_type}
                  </p>
                  <p>Category: {selected.row.job_categories?.category_name}</p>
                  <h4>Description</h4>
                  <p className={styles.multiline}>
                    {selected.row.job_description}
                  </p>
                  <h4>Requirements</h4>
                  <p className={styles.multiline}>
                    {selected.row.requirements}
                  </p>
                  <p>
                    Company status: {label(selected.row.company?.review_status)}
                  </p>
                  {selected.row.status === "Pending" ? (
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButtonPrimary}
                        disabled={
                          busy ||
                          selected.row.company?.review_status !== "approved"
                        }
                        onClick={() => review("Approved")}
                      >
                        Approve job
                      </button>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => review("Rejected")}
                      >
                        Reject job
                      </button>
                    </div>
                  ) : (
                    <p className={styles.help}>
                      Only Pending jobs can be reviewed. Company content edits
                      return this job to Pending.
                    </p>
                  )}
                </>
              )}
              {selected.kind === "application" && (
                <>
                  <ApplicationDetails app={selected.row} />
                  {APPLICATION_NEXT[selected.row.application_status]?.length >
                  0 ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (
                          window.confirm(
                            `Change this application to ${nextStatus}?`,
                          )
                        )
                          write(
                            "application_status",
                            selected.row.application_id,
                            {
                              status: nextStatus,
                              expected_status: selected.row.application_status,
                              company_decision_confirmed: confirmed,
                            },
                            `Application moved to ${nextStatus}.`,
                          );
                      }}
                    >
                      <label className={styles.field}>
                        Next status
                        <select
                          required
                          value={nextStatus}
                          disabled={busy}
                          onChange={(e) => {
                            setNextStatus(e.target.value);
                            setConfirmed(false);
                          }}
                        >
                          <option value="">Choose a status</option>
                          {APPLICATION_NEXT[
                            selected.row.application_status
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      {["Hired", "Rejected"].includes(nextStatus) && (
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            required
                            checked={confirmed}
                            disabled={busy}
                            onChange={(e) => setConfirmed(e.target.checked)}
                          />
                          I have confirmed this decision with the company.
                        </label>
                      )}
                      {interviewOf(selected.row)?.interview_status ===
                        "Scheduled" && (
                        <p className={styles.warning}>
                          Complete or cancel the scheduled interview before
                          recording a final decision.
                        </p>
                      )}
                      <button
                        className={styles.actionButtonPrimary}
                        disabled={
                          busy ||
                          !nextStatus ||
                          interviewOf(selected.row)?.interview_status ===
                            "Scheduled"
                        }
                      >
                        {busy ? "Saving…" : "Save status"}
                      </button>
                    </form>
                  ) : (
                    <p className={styles.help}>
                      This application has a final decision and cannot be
                      changed.
                    </p>
                  )}
                </>
              )}
              {selected.kind === "schedule" && (
                <>
                  <p>
                    <strong>{fullName(selected.row.applicant)}</strong> ·{" "}
                    {selected.row.job?.job_title}
                  </p>
                  <p className={styles.help}>
                    Enter both times in Philippine time. The end must be later
                    than the start. Use the same location name for the same room
                    or booth.
                  </p>
                  {hostsError && (
                    <p role="alert" className={styles.error}>
                      {hostsError} Close and reopen this form to reload staff.
                    </p>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        const data = {
                          ...schedule,
                          starts_at: philippineISO(schedule.starts_at),
                          ends_at: philippineISO(schedule.ends_at),
                          expected_interview: selected.interview,
                        };
                        write(
                          "schedule",
                          selected.row.application_id,
                          data,
                          "Interview schedule saved.",
                        );
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    <label className={styles.field}>
                      Assigned staff member
                      <select
                        required
                        value={schedule.staff_id}
                        disabled={busy || hostsLoading}
                        onChange={(e) =>
                          setSchedule({ ...schedule, staff_id: e.target.value })
                        }
                      >
                        <option value="">
                          {hostsLoading
                            ? "Loading staff…"
                            : "Choose staff member"}
                        </option>
                        {schedule.staff_id &&
                          !assignees.some(
                            (p) => p.user_id === schedule.staff_id,
                          ) &&
                          !hostsLoading && (
                            <option value={schedule.staff_id} disabled>
                              Previous staff member unavailable — select another
                            </option>
                          )}
                        {assignees.map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {fullName(p)} ({p.role})
                            {p.user_id === profile?.user_id ? " — You" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        Starts at (Philippine time)
                        <input
                          required
                          type="datetime-local"
                          value={schedule.starts_at}
                          disabled={busy}
                          onChange={(e) =>
                            setSchedule({
                              ...schedule,
                              starts_at: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        Ends at (Philippine time)
                        <input
                          required
                          type="datetime-local"
                          value={schedule.ends_at}
                          disabled={busy}
                          onChange={(e) =>
                            setSchedule({
                              ...schedule,
                              ends_at: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      Location / room / booth
                      <input
                        required
                        maxLength={500}
                        value={schedule.interview_location}
                        disabled={busy}
                        placeholder="e.g. Interview Booth A-1"
                        onChange={(e) =>
                          setSchedule({
                            ...schedule,
                            interview_location: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButtonSchedule}
                        disabled={
                          busy ||
                          hostsLoading ||
                          !!hostsError ||
                          !assignees.some(
                            (p) => p.user_id === schedule.staff_id,
                          )
                        }
                      >
                        {busy ? "Saving…" : "Save schedule"}
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => setSelected(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
