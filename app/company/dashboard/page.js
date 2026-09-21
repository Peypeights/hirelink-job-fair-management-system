import styles from "./dashboard.module.css";

const JOBS = [
  {
    title: "Junior Full-Stack Developer",
    location: "Taguig, Metro Manila",
    type: "Full-time",
    applicants: 24,
    status: "Active",
  },
  {
    title: "UI/UX Designer",
    location: "Makati, Metro Manila",
    type: "Full-time",
    applicants: 18,
    status: "Active",
  },
  {
    title: "IT Support Specialist",
    location: "Manila",
    type: "Full-time",
    applicants: 12,
    status: "Active",
  },
];

const APPLICANT_DATA = [
  { label: "Mon", value: 35 },
  { label: "Tue", value: 50 },
  { label: "Wed", value: 70 },
  { label: "Thu", value: 45 },
  { label: "Fri", value: 85 },
];

export default function CompanyDashboard() {
  return (
    <div className={styles.dashboardContainer}>

      <nav className={styles.navBar}>
        <div>
          <span className={styles.logoText}>HireLink</span>
          <span className={styles.portalBadge}>Company Portal</span>
        </div>

        <div style={{ fontSize: "0.75rem", color: "#74758A", fontWeight: "600" }}>
          TechSynergy Solutions
        </div>
      </nav>

      <div className={styles.welcomeHero}>
        <h1>Welcome, TechSynergy Solutions</h1>
        <p>
          Manage your job postings, review applicants, and monitor your
          recruitment activity.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Job Postings</div>
          <div className={styles.statValue}>3</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Applicants</div>
          <div className={styles.statValue}>54</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending Applications</div>
          <div className={styles.statValue}>17</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Interviews Scheduled</div>
          <div className={styles.statValue}>8</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Job Postings</h2>
        </div>

        {JOBS.map((job, index) => (
          <div className={styles.jobItem} key={index}>
            <span className={styles.statusBadge}>{job.status}</span>

            <h3 className={styles.jobTitle}>{job.title}</h3>

            <p className={styles.jobDetails}>
              {job.location} · {job.type} · {job.applicants} applicants
            </p>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Applicant Statistics</h2>
          </div>

          <div className={styles.chart}>
            {APPLICANT_DATA.map((item, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  className={styles.chartBar}
                  style={{ height: `${item.value}%` }}
                />
                <div className={styles.chartLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Company Profile</h2>
          </div>

          <div className={styles.profileItem}>
            <div className={styles.profileLabel}>Company Name</div>
            <div className={styles.profileValue}>
              TechSynergy Solutions
            </div>
          </div>

          <div className={styles.profileItem}>
            <div className={styles.profileLabel}>Industry</div>
            <div className={styles.profileValue}>
              Software Engineering & IT
            </div>
          </div>

          <div className={styles.profileItem}>
            <div className={styles.profileLabel}>Location</div>
            <div className={styles.profileValue}>
              Manila, Philippines
            </div>
          </div>

          <div className={styles.profileItem}>
            <div className={styles.profileLabel}>Contact</div>
            <div className={styles.profileValue}>
              hr@techsynergy.com
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}