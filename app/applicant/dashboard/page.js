import styles from "./dashboard.module.css";

const applications = [
  {
    job: "Software Developer",
    company: "TechCorp",
    status: "Interview",
  },
  {
    job: "UI/UX Designer",
    company: "Creative Co.",
    status: "Pending",
  },
  {
    job: "Web Developer",
    company: "Innovate PH",
    status: "Rejected",
  },
];

const jobs = [
  {
    title: "Software Developer",
    company: "TechCorp",
    location: "Makati, Metro Manila",
  },
  {
    title: "UI/UX Designer",
    company: "Creative Co.",
    location: "Taguig, Metro Manila",
  },
  {
    title: "Web Developer",
    company: "Innovate PH",
    location: "Pasig, Metro Manila",
  },
];

export default function ApplicantDashboard() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>

        <header className={styles.header}>
          <div className={styles.logo}>
            Hire<span>Link</span>
          </div>

          <div className={styles.profile}>
            Applicant Profile
          </div>
        </header>

        <section className={styles.welcome}>
          <h1>Welcome back, Alex</h1>
          <p>
            Manage your applications and upcoming interviews.
          </p>
        </section>

        <section className={styles.stats}>

          <div className={styles.statCard}>
            <h3>Total Applications</h3>
            <div className={styles.statNumber}>3</div>
          </div>

          <div className={styles.statCard}>
            <h3>Upcoming Interviews</h3>
            <div className={styles.statNumber}>1</div>
          </div>

          <div className={styles.statCard}>
            <h3>Available Jobs</h3>
            <div className={styles.statNumber}>12</div>
          </div>

        </section>

        <section className={styles.content}>

          <div className={styles.card}>
            <h2>My Applications</h2>

            {applications.map((application, index) => (
              <div
                className={styles.application}
                key={index}
              >
                <div className={styles.applicationTop}>

                  <div>
                    <h3>{application.job}</h3>
                    <p className={styles.company}>
                      {application.company}
                    </p>
                  </div>

                  <span className={styles.status}>
                    {application.status}
                  </span>

                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h2>Upcoming Interview</h2>

            <div className={styles.interview}>
              <h3>Software Developer</h3>

              <p>TechCorp</p>
              <p>September 20, 2026</p>
              <p>10:00 AM</p>

              <a
                href="#"
                className={styles.button}
              >
                View Details
              </a>
            </div>
          </div>

        </section>

        <section>
          <div className={styles.card}>
            <h2>Available Jobs</h2>

            <div className={styles.jobs}>

              {jobs.map((job, index) => (
                <div
                  className={styles.jobCard}
                  key={index}
                >
                  <h3>{job.title}</h3>

                  <p>{job.company}</p>
                  <p>{job.location}</p>

                  <a
                    href="#"
                    className={styles.jobButton}
                  >
                    View Job
                  </a>
                </div>
              ))}

            </div>
          </div>
        </section>

      </div>
    </main>
  );
}