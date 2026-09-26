"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

const items = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "reviews", label: "Company reviews", icon: "▣" },
  { id: "accounts", label: "User accounts", icon: "♙" },
  { id: "reports", label: "Reports", icon: "▤" },
];

export default function AdminNav({ pendingCount }) {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    let frame = 0;

    function updateActiveSection() {
      frame = 0;
      // Choose the last section whose heading has reached the upper viewport.
      // Near the bottom, ensure the final section can become active.
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        setActive("reports");
        return;
      }

      let current = "overview";
      for (const item of items) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= 180)
          current = item.id;
      }
      setActive(current);
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    }

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="Admin sections" className={styles.nav}>
      <Link href="/staff/dashboard">
        ▣ <span>Staff workspace</span>
      </Link>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={active === item.id ? styles.selected : undefined}
          aria-current={active === item.id ? "location" : undefined}
        >
          {item.icon} <span>{item.label}</span>
          {item.id === "reviews" && pendingCount > 0 && <b>{pendingCount}</b>}
        </a>
      ))}
    </nav>
  );
}
