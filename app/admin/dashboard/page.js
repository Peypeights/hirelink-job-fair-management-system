import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../../lib/auth/requireRole";
import AdminNav from "./AdminNav";
import styles from "./dashboard.module.css";

const date = (value) => value ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";
const name = (person) => [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Unnamed user";

export default async function AdminDashboard({ searchParams }) {
  const { user } = await requireRole("admin");
  const supabase = await createClient();
  const [{ data: users, error: userError }, { data: companies, error: companyError }] = await Promise.all([
    supabase.from("user_profiles").select("user_id,email,first_name,last_name,role,is_active,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("company_profiles").select("user_id,company_name,industry,address,description,website,contact_email,contact_phone,review_status,created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const { notice } = await searchParams;
  const messages = { reviewed: "Company review saved.", updated: "Account updated.", invalid: "The requested change was invalid.", error: "Could not save the change. Check that the admin migration has been applied.", "logout-error": "Could not log out. Please try again." };
  const people = users || [];
  const organizations = companies || [];
  const pending = organizations.filter((company) => company.review_status === "pending");
  const approved = organizations.filter((company) => company.review_status === "approved");
  const active = people.filter((person) => person.is_active);
  const applicantCount = people.filter((person) => person.role === "applicant").length;
  const staffCount = people.filter((person) => person.role === "staff").length;
  const owners = new Map(people.map((person) => [person.user_id, person]));

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="/admin/dashboard"><span className={styles.brandMark}>H</span><span>HireLink<small>ADMIN WORKSPACE</small></span></a>
      <div className={styles.navLabel}>WORKSPACE</div>
      <AdminNav pendingCount={pending.length} />
      <div className={styles.sidebarFoot}>
        <div className={styles.account}><div className={styles.avatar}>AD</div><span>Administrator<small>{user.email}</small></span></div>
        <form action="/auth/logout" method="post"><button type="submit" className={styles.logoutButton}>↪ <span>Log out</span></button></form>
      </div>
    </aside>
    <main className={styles.main} id="overview">
      <header className={styles.topbar}><span>Workspace <span className={styles.slash}>/</span> Overview</span><span className={styles.topRight}><span className={styles.liveDot} /> Admin dashboard</span></header>
      <div className={styles.content}>
        <div className={styles.heading}><div><div className={styles.eyebrow}>ADMIN OVERVIEW</div><h1>Good to have you here.</h1><p>Keep your people and company registrations moving.</p></div><div className={styles.today}>⌁ &nbsp; {date(new Date().toISOString())}</div></div>
        {notice && messages[notice] && <p role="status" className={styles.notice}>{messages[notice]}</p>}
        {(userError || companyError) && <p role="alert" className={styles.alert}>Dashboard data could not be loaded. Apply the admin SQL migration and check the Supabase connection.</p>}
        <section className={styles.stats} aria-label="Current totals">
          <div className={styles.stat}><div className={styles.statIcon}>♙</div><span>Total accounts</span><strong>{people.length}</strong><small>{active.length} active accounts</small></div>
          <div className={styles.stat}><div className={styles.statIcon}>▣</div><span>Companies</span><strong>{organizations.length}</strong><small>{approved.length} approved</small></div>
          <div className={`${styles.stat} ${styles.accentStat}`}><div className={styles.statIcon}>⌛</div><span>Awaiting review</span><strong>{pending.length}</strong><small>Company registrations</small></div>
          <div className={styles.stat}><div className={styles.statIcon}>✧</div><span>Applicants</span><strong>{applicantCount}</strong><small>{staffCount} staff members</small></div>
        </section>
        <section id="reviews" className={styles.section}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>REVIEW QUEUE</span><h2>Company registrations</h2><p>Review company details before granting access.</p></div><span className={styles.count}>{pending.length} pending</span></div>
          {organizations.length === 0 ? <div className={styles.empty}>No company registrations yet.</div> : <div className={styles.companyGrid}>{organizations.map((company) => <article className={styles.companyCard} key={company.user_id}>
            <div className={styles.cardTop}><span className={styles.companyInitial}>{company.company_name?.slice(0, 1).toUpperCase() || "C"}</span><span className={`${styles.badge} ${styles[company.review_status] || ""}`}>{company.review_status || "unknown"}</span></div>
            <h3>{company.company_name}</h3><p className={styles.meta}>{company.industry || "Industry not provided"} · {date(company.created_at)}</p>
            <p className={styles.description}>{company.description || "No description provided."}</p>
            <dl className={styles.details}><div><dt>Representative</dt><dd>{name(owners.get(company.user_id))}</dd></div><div><dt>Location</dt><dd>{company.address || "—"}</dd></div><div><dt>Contact</dt><dd>{company.contact_email || "—"}</dd></div><div><dt>Phone</dt><dd>{company.contact_phone || "—"}</dd></div></dl>
            {company.website && /^https?:\/\//i.test(company.website) && <a className={styles.website} href={company.website} target="_blank" rel="noopener noreferrer">Visit website ↗</a>}
            <div className={styles.actions}>{company.review_status !== "approved" && <form action="/api/admin/company-review" method="post"><input type="hidden" name="user_id" value={company.user_id}/><input type="hidden" name="status" value="approved"/><button className={styles.primary}>Approve</button></form>}{company.review_status !== "rejected" && <form action="/api/admin/company-review" method="post"><input type="hidden" name="user_id" value={company.user_id}/><input type="hidden" name="status" value="rejected"/><button className={styles.secondary}>Reject</button></form>}{company.review_status !== "pending" && <form action="/api/admin/company-review" method="post"><input type="hidden" name="user_id" value={company.user_id}/><input type="hidden" name="status" value="pending"/><button className={styles.textButton}>Reset to pending</button></form>}</div>
          </article>)}</div>}
          {organizations.length === 500 && <p className={styles.limit}>Showing the most recent 500 company profiles.</p>}
        </section>
        <section id="accounts" className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>PEOPLE & ACCESS</span><h2>User accounts</h2><p>Manage access and assign staff from existing applicant accounts.</p></div><span className={styles.count}>{people.length} accounts</span></div>
          <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>{people.map((person) => <tr key={person.user_id}><td><strong>{name(person)}</strong><small>{person.email}</small></td><td><span className={styles.role}>{person.role}</span></td><td>{date(person.created_at)}</td><td><span className={person.is_active ? styles.active : styles.inactive}>{person.is_active ? "Active" : "Inactive"}</span></td><td>{person.user_id === user.id || person.role === "admin" ? <span className={styles.muted}>Protected</span> : <div className={styles.userActions}>{person.role !== "company" && <form action="/api/admin/account" method="post"><input type="hidden" name="user_id" value={person.user_id}/><input type="hidden" name="active" value={String(person.is_active)}/><input type="hidden" name="role" value={person.role === "staff" ? "applicant" : "staff"}/><button className={styles.linkButton}>{person.role === "staff" ? "Remove staff" : "Make staff"}</button></form>}<form action="/api/admin/account" method="post"><input type="hidden" name="user_id" value={person.user_id}/><input type="hidden" name="role" value={person.role}/><input type="hidden" name="active" value={String(!person.is_active)}/><button className={styles.linkButton}>{person.is_active ? "Deactivate" : "Reactivate"}</button></form></div>}</td></tr>)}{people.length === 0 && <tr><td colSpan="5" className={styles.empty}>No accounts found.</td></tr>}</tbody></table></div>
          {people.length === 500 && <p className={styles.limit}>Showing the most recent 500 accounts.</p>}
        </section>
        <section id="reports" className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>AT A GLANCE</span><h2>Reports</h2><p>Current totals from saved user and company profiles.</p></div></div><div className={styles.reportGrid}><div><span>Company status</span><strong>{pending.length} pending · {approved.length} approved · {organizations.filter(c => c.review_status === "rejected").length} rejected</strong></div><div><span>Account status</span><strong>{active.length} active · {people.length - active.length} inactive</strong></div></div><p className={styles.limit}>Job, application, interview, and category reports will appear after those tables are added.</p></section>
        <footer className={styles.footer}>HireLink · Administration workspace</footer>
      </div>
    </main>
  </div>;
}
