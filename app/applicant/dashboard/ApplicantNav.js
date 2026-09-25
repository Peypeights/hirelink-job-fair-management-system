"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

const items = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "applications", label: "My Applications", icon: "▣" },
  { id: "interviews", label: "Interviews", icon: "◷" },
  { id: "jobs", label: "Available Jobs", icon: "⌕" },
];

export default function ApplicantNav() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    let frame = 0;

    function updateActiveSection() {
      frame = 0;

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        setActive("jobs");
        return;
      }

      let current = "overview";

      for (const item of items) {
        const section = document.getElementById(item.id);

        if (
          section &&
          section.getBoundingClientRect().top <= 180
        ) {
          current = item.id;
        }
      }

      setActive(current);
    }

    function scheduleUpdate() {
      if (!frame) {
        frame = window.requestAnimationFrame(updateActiveSection);
      }
    }

    scheduleUpdate();

    window.addEventListener("scroll", scheduleUpdate, {
      passive: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <nav aria-label="Applicant sections" className={styles.nav}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={
            active === item.id ? styles.selected : undefined
          }
          aria-current={
            active === item.id ? "location" : undefined
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}