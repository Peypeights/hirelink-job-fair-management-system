import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1 className={styles.test1}>HireLink</h1>
      <br />
      <p className={styles.test2}>Connect with companies and discover job opportunities.</p>
      <p>Landing page here</p>
      <br />
      <br />
      <br />
      <Link href="/auth">Click nyo toh para mapunta kayo sa login/signup page</Link>
    </main>
  );
}