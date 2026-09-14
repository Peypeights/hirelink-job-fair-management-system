import Link from "next/link";
import { requireCompanyRouteAccess } from "../../../lib/auth/companyRouting";
import styles from "./pending-review.module.css";

export default async function PendingReviewPage() {
  const { companyProfile } = await requireCompanyRouteAccess({
    requirePending: true,
  });

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="pending-title">
        <div className={styles.icon} aria-hidden="true">
          <span></span>
          <span></span>
        </div>

        <p className={styles.eyebrow}>COMPANY PROFILE</p>

        <h1 id="pending-title">Your profile is under review</h1>

        <p className={styles.companyName}>{companyProfile.company_name}</p>

        <p className={styles.description}>
          Thanks for submitting your company details. Your profile is awaiting
          staff review before you can access the company dashboard.
        </p>

        <p className={styles.note}>
          We&apos;ll update your HireLink access after the review is complete.
        </p>

        <Link className={styles.link} href="/auth">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
