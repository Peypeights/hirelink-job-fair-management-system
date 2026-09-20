import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "HireLink | Bring your next job fair together",
  description: "Connect applicants, companies, and organizers. Bring job postings, applications, and interview schedules together with HireLink.",
};

function Brand() {
  return <a className={styles.brand} href="#top" aria-label="HireLink home"><svg width="27" height="30" viewBox="0 0 27 30" fill="none" aria-hidden="true"><path d="M5 3v24M22 3v24M5 15h17" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/><path d="m10 10 7 10" stroke="#A99CFF" strokeWidth="5" strokeLinecap="round"/></svg>HireLink</a>;
}

const interviews = [
  ["9:00", "AM", "Maria Cruz", "Product design intern", "Studio North", "Confirmed"],
  ["9:30", "AM", "Daniel Reyes", "Junior web developer", "Orbit Digital", "Confirmed"],
  ["10:00", "AM", "Sam Lee", "Marketing associate", "Common Ground", "Awaiting reply"],
];
const features = [
  ["Job listings", "Give every opportunity a place.", "Share open roles, requirements, and company details so applicants know where they could fit."],
  ["Applicant tracking", "Keep the next step in sight.", "Review applications and follow each candidate from submission to interview."],
  ["Interview scheduling", "Make room for a conversation.", "Bring interview times and candidate details into one shared schedule."],
  ["Reports & oversight", "See how your fair is taking shape.", "Keep company reviews, application activity, and event reporting together."],
];

export default function Home() {
  return <div className={styles.page} id="top">
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}>
      <Brand />
      <nav className={styles.nav} aria-label="Main navigation"><a href="#features">Features</a><a href="#participants">Who it’s for</a><a href="#how-it-works">How it works</a></nav>
      <div className={styles.account}><Link href="/auth">Sign in</Link><Link className={styles.primary} href="/auth?mode=signup">Get started</Link></div>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.intro}>A shared space for your next job fair</p>
          <h1 id="hero-title">Good opportunities.<br />Better connections.</h1>
          <p className={styles.lead}>Bring applicants, companies, and your team together. From the first application to the next interview, keep your job fair moving with HireLink.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/auth?mode=signup">Get started</Link><a className={styles.secondary} href="#opportunities">Browse jobs</a></div>
          <p className={styles.heroNote}>For schools, organizations, and the people they connect.</p>
        </div>
        <figure className={styles.preview}>
          <div className={styles.previewTop}><span className={styles.previewBrand}>HireLink <span>/</span> Interviews</span><span className={styles.sample}>Sample view</span></div>
          <div className={styles.scheduleHeading}><div><p>Campus career fair</p><h2>A day of possibilities.</h2></div><span className={styles.date}>Oct<strong>15</strong></span></div>
          <div className={styles.scheduleMeta}><span>Morning schedule</span><span>3 interviews</span></div>
          <div className={styles.interviews}>{interviews.map(([time, period, name, role, company, status]) => <div className={styles.interview} key={name}><div className={styles.time}>{time}<small>{period}</small></div><div className={styles.candidate}><strong>{name}</strong><span>{role}</span><small>{company}</small></div><span className={status === "Confirmed" ? styles.confirmed : styles.pending}>{status}</span></div>)}</div>
          <figcaption className={styles.previewBottom}><span className={styles.check} aria-hidden="true">✓</span> The right details. All in one place.</figcaption>
        </figure>
      </section>
      <div className={styles.audienceStrip}><p>One fair. Everyone connected.</p><span>Applicants</span><span>Companies</span><span>Job fair staff</span><span>Administrators</span></div>
      <section className={styles.features} id="features" aria-labelledby="features-title">
        <div className={styles.sectionHeading}><h2 id="features-title">Less coordination.<br />More conversations.</h2><p>Give the details a home, so your team can focus on helping people take their next step.</p></div>
        <div className={styles.featureGrid}>{features.map(([label, title, copy]) => <article className={styles.feature} key={label}><p className={styles.featureLabel}>{label}</p><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section className={styles.participants} id="participants" aria-labelledby="participants-title"><div><h2 id="participants-title">Different roles.<br />A shared purpose.</h2><p>Everyone has a part in a successful job fair. HireLink gives each person a place to start.</p><Link className={styles.primary} href="/auth?mode=signup">Find your place</Link></div><div className={styles.roles}>{[["Applicants", "Explore opportunities, send applications, and keep track of interviews."], ["Company representatives", "Introduce your company, post roles, and meet potential hires."], ["Job fair staff", "Coordinate reviews and interview schedules across the event."], ["Administrators", "Oversee accounts, categories, and reports from one place."]].map(([role, copy]) => <article key={role}><h3>{role}</h3><p>{copy}</p></article>)}</div></section>
      <section className={styles.process} id="how-it-works" aria-labelledby="process-title"><h2 id="process-title">From an opening to a conversation.</h2><ol>{[["Share an opportunity", "Companies introduce their roles and what they’re looking for."], ["Make a connection", "Applicants explore openings and submit their applications."], ["Meet your next hire", "Teams review candidates and coordinate the next interview."]].map(([title, copy], index) => <li key={title}><span>{index + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
      <section className={styles.opportunities} id="opportunities" aria-labelledby="jobs-title"><div className={styles.sectionHeading}><h2 id="jobs-title">A look at what’s possible.</h2><p>Sample opportunities to explore the experience. These are illustrative roles, not live vacancies.</p></div><div className={styles.jobs}>{[["SN", "Studio North", "Product design intern", "Internship"], ["OD", "Orbit Digital", "Junior web developer", "Full-time"], ["CG", "Common Ground", "Marketing associate", "Full-time"]].map(([initials, company, role, type]) => <article className={styles.job} key={company}><span className={styles.companyMark} aria-hidden="true">{initials}</span><div><p>{company}</p><h3>{role}</h3></div><span className={styles.jobType}>{type}</span><span className={styles.sample}>Sample role</span></article>)}</div></section>
      <section className={styles.cta}><div><h2>Your next job fair starts here.</h2><p>Make space for the connections that come next.</p></div><Link className={styles.lightButton} href="/auth?mode=signup">Create an account</Link></section>
    </main>
    <footer className={styles.footer}><div><Brand /><p>People. Opportunities. A brighter tomorrow.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/auth">Sign in</Link></nav><small>© {new Date().getFullYear()} HireLink</small></footer>
  </div>;
}
