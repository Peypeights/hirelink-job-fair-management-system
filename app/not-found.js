import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>

      <div className={styles.container}>

        <div className={styles.logo}>
          Hire<span>Link</span>
        </div>

        <div className={styles.errorCode}>
          404
        </div>

        <h1>Page Not Found</h1>

        <p>
          Sorry, the page you are looking for does not exist
          or may have been moved.
        </p>

        <Link href="/" className={styles.button}>
          Back to Home
        </Link>

      </div>

    </main>
  );
}