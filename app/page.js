"use client";

import styles from "./page.module.css";
import Link from "next/link";
import StaffDashboard from "./staff/dashboard/page.js"; 

export default function Home() {
  
  const PREVIEW_MODE = false; 

  if (PREVIEW_MODE) {
    return <StaffDashboard />;
  }

  
  return (
    <main>
      <h1 className={styles.test1}>HireLink</h1>
      <br></br>
      <p className={styles.test2}>Connect with companies and discover job opportunities.</p>
      <p>Landing page dito</p>
      <br></br>
      <br></br>
      <br></br>
      <Link href="/auth">Click nyo toh to para mapunta kayo sa login/signup page</Link>
    </main>
  );
}
