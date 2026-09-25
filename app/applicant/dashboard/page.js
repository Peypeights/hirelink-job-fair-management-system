import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../../lib/auth/requireRole";
import ApplicantNav from "./ApplicantNav";
import styles from "./dashboard.module.css";

const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "—";

const name = (person) =>
  [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ") ||
  person?.email ||
  "Applicant";

export default async function ApplicantDashboard() {
  const { user } = await requireRole("applicant");
  const supabase = await createClient();

  // Applicant information
  const { data: applicant } = await supabase
    .from("user_profiles")
    .select("user_id,email,first_name,last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Applications
  const { data: applicationData, error: applicationError } =
    await supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        job_postings (
          id,
          title,
          location,
          company_user_id
        )
      `)
      .eq("applicant_user_id", user.id)
      .order("applied_at", { ascending: false });

  const applications = applicationData || [];

  // Companies used by applications
  const applicationCompanyIds = applications
    .map(
      (application) =>
        application.job_postings?.company_user_id
    )
    .filter(Boolean);

  let applicationCompanies = [];

  if (applicationCompanyIds.length > 0) {
    const { data } = await supabase
      .from("company_profiles")
      .select("user_id,company_name")
      .in("user_id", applicationCompanyIds);

    applicationCompanies = data || [];
  }

  // Upcoming interviews
  const { data: interviewData, error: interviewError } =
    await supabase
      .from("interviews")
      .select(`
        id,
        scheduled_at,
        status,
        details,
        job_postings (
          title,
          company_user_id
        )
      `)
      .eq("applicant_user_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

  const interviews = interviewData || [];

  // Companies used by interviews
  const interviewCompanyIds = interviews
    .map(
      (interview) =>
        interview.job_postings?.company_user_id
    )
    .filter(Boolean);

  let interviewCompanies = [];

  if (interviewCompanyIds.length > 0) {
    const { data } = await supabase
      .from("company_profiles")
      .select("user_id,company_name")
      .in("user_id", interviewCompanyIds);

    interviewCompanies = data || [];
  }

  // Available jobs
  const { data: jobData, error: jobError } = await supabase
    .from("job_postings")
    .select(
      "id,title,location,company_user_id,created_at"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const jobs = jobData || [];

  // Companies used by available jobs
  const jobCompanyIds = jobs
    .map((job) => job.company_user_id)
    .filter(Boolean);

  let jobCompanies = [];

  if (jobCompanyIds.length > 0) {
    const { data } = await supabase
      .from("company_profiles")
      .select("user_id,company_name")
      .in("user_id", jobCompanyIds);

    jobCompanies = data || [];
  }

  function getCompanyName(companyId, companies) {
    const company = companies.find(
      (item) => item.user_id === companyId
    );

    return company?.company_name || "Company";
  }

  const applicantName = name(applicant);

  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted"
  ).length;

  return (
    <div className={styles.shell}>

      <aside className={styles.sidebar}>

        <a
          className={styles.brand}
          href="/applicant/dashboard"
        >
          <span className={styles.brandMark}>H</span>

          <span>
            HireLink
            <small>APPLICANT WORKSPACE</small>
          </span>
        </a>

        <div className={styles.navLabel}>
          WORKSPACE
        </div>

        <ApplicantNav />

        <div className={styles.sidebarFoot}>

          <div className={styles.account}>
            <div className={styles.avatar}>
              {applicant?.first_name
                ?.slice(0, 1)
                .toUpperCase() || "AP"}
            </div>

            <span>
              {applicantName}
              <small>{user.email}</small>
            </span>
          </div>

          <form
            action="/auth/logout"
            method="post"
          >
            <button
              type="submit"
              className={styles.logoutButton}
            >
              ↪ <span>Log out</span>
            </button>
          </form>

        </div>

      </aside>

      <main className={styles.main}>

        <header className={styles.topbar}>
          <span>
            Workspace
            <span className={styles.slash}>/</span>
            Overview
          </span>

          <span className={styles.topRight}>
            <span className={styles.liveDot} />
            Applicant dashboard
          </span>
        </header>

        <div className={styles.content}>

          <section
            id="overview"
            className={styles.heading}
          >
            <div>
              <div className={styles.eyebrow}>
                APPLICANT OVERVIEW
              </div>

              <h1>
                Welcome back, {applicantName}.
              </h1>

              <p>
                Keep track of your applications,
                interviews, and available jobs.
              </p>
            </div>

            <div className={styles.today}>
              {date(new Date().toISOString())}
            </div>
          </section>

          {(applicationError ||
            interviewError ||
            jobError) && (
            <p className={styles.alert}>
              Some dashboard data could not be loaded.
            </p>
          )}

          <section
            className={styles.stats}
            aria-label="Applicant totals"
          >

            <div className={styles.stat}>
              <div className={styles.statIcon}>
                ▣
              </div>

              <span>
                My applications
              </span>

              <strong>
                {applications.length}
              </strong>

              <small>
                Submitted applications
              </small>
            </div>

            <div className={styles.stat}>
              <div className={styles.statIcon}>
                ◷
              </div>

              <span>
                Upcoming interviews
              </span>

              <strong>
                {interviews.length}
              </strong>

              <small>
                Scheduled interviews
              </small>
            </div>

            <div className={styles.stat}>
              <div className={styles.statIcon}>
                ⌕
              </div>

              <span>
                Available jobs
              </span>

              <strong>
                {jobs.length}
              </strong>

              <small>
                Approved job postings
              </small>
            </div>

            <div className={styles.stat}>
              <div className={styles.statIcon}>
                ✓
              </div>

              <span>
                Accepted applications
              </span>

              <strong>
                {acceptedApplications}
              </strong>

              <small>
                Applications accepted
              </small>
            </div>

          </section>

          <section
            id="applications"
            className={styles.section}
          >

            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>
                  APPLICATIONS
                </span>

                <h2>
                  My applications
                </h2>

                <p>
                  Track the current status of your applications.
                </p>
              </div>

              <span className={styles.count}>
                {applications.length} total
              </span>
            </div>

            {applications.length === 0 ? (
              <div className={styles.empty}>
                No applications yet.
              </div>
            ) : (
              <div className={styles.applicationList}>

                {applications.map((application) => (
                  <article
                    className={styles.applicationCard}
                    key={application.id}
                  >

                    <div>
                      <h3>
                        {application.job_postings?.title ||
                          "Job"}
                      </h3>

                      <p className={styles.meta}>
                        {getCompanyName(
                          application.job_postings
                            ?.company_user_id,
                          applicationCompanies
                        )}
                      </p>

                      <p className={styles.meta}>
                        {application.job_postings?.location ||
                          "Location not provided"}
                        {" · "}
                        Applied {date(application.applied_at)}
                      </p>
                    </div>

                    <span
                      className={`${styles.badge} ${
                        styles[application.status] || ""
                      }`}
                    >
                      {application.status}
                    </span>

                  </article>
                ))}

              </div>
            )}

          </section>

          <section
            id="interviews"
            className={styles.section}
          >

            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>
                  INTERVIEWS
                </span>

                <h2>
                  Upcoming interviews
                </h2>

                <p>
                  View your scheduled interview dates.
                </p>
              </div>

              <span className={styles.count}>
                {interviews.length} scheduled
              </span>
            </div>

            {interviews.length === 0 ? (
              <div className={styles.empty}>
                No upcoming interviews.
              </div>
            ) : (
              <div className={styles.interviewList}>

                {interviews.map((interview) => (
                  <article
                    className={styles.interviewCard}
                    key={interview.id}
                  >

                    <div>
                      <h3>
                        {interview.job_postings?.title ||
                          "Interview"}
                      </h3>

                      <p className={styles.meta}>
                        {getCompanyName(
                          interview.job_postings
                            ?.company_user_id,
                          interviewCompanies
                        )}
                      </p>

                      <p className={styles.meta}>
                        {new Intl.DateTimeFormat("en-PH", {
                          dateStyle: "full",
                          timeStyle: "short",
                        }).format(
                          new Date(interview.scheduled_at)
                        )}
                      </p>
                    </div>

                    <span
                      className={`${styles.badge} ${styles.scheduled}`}
                    >
                      Scheduled
                    </span>

                  </article>
                ))}

              </div>
            )}

          </section>

          <section
            id="jobs"
            className={styles.section}
          >

            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>
                  JOBS
                </span>

                <h2>
                  Available jobs
                </h2>

                <p>
                  Browse currently approved job postings.
                </p>
              </div>

              <span className={styles.count}>
                {jobs.length} available
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className={styles.empty}>
                No available jobs yet.
              </div>
            ) : (
              <div className={styles.jobGrid}>

                {jobs.map((job) => (
                  <article
                    className={styles.jobCard}
                    key={job.id}
                  >

                    <div className={styles.jobTop}>
                      <div className={styles.jobIcon}>
                        {job.title
                          ?.slice(0, 1)
                          .toUpperCase() || "J"}
                      </div>
                    </div>

                    <h3>
                      {job.title}
                    </h3>

                    <p className={styles.meta}>
                      {getCompanyName(
                        job.company_user_id,
                        jobCompanies
                      )}
                    </p>

                    <p className={styles.meta}>
                      {job.location}
                    </p>

                  </article>
                ))}

              </div>
            )}

          </section>

          <footer className={styles.footer}>
            HireLink · Applicant workspace
          </footer>

        </div>

      </main>

    </div>
  );
}