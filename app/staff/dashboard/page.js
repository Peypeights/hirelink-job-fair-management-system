"use client";

import React, { useState, useEffect } from "react";
import styles from "./dashboard.module.css"; 

const INITIAL_COMPANIES = [
  {
    company_id: "c1",
    company_name: "TechSynergy Solutions",
    company_description: "Enterprise cloud software development and IT consultation services based in Manila.",
    contact_information: "hr@techsynergy.com | +63 2 8123 4567",
    review_status: "Pending",
    created_at: "2026-09-18T10:00:00Z",
  },
];

const INITIAL_JOBS = [
  {
    job_id: "j1",
    company_name: "TechSynergy Solutions",
    job_title: "Junior Full-Stack Developer",
    category_name: "Software Engineering",
    employment_type: "Full-time",
    location: "Taguig, Metro Manila (Hybrid)",
    job_description: "Looking for a React and Next.js developer to maintain internal dashboards.",
    requirements: "Knowledge of JavaScript, React hooks, and relational database foundations.",
    status: "Pending",
  },
];

const ALL_APPLICATIONS = [
  {
    application_id: "a3",
    job_title: "Frontend Developer",
    company_name: "TechSynergy Solutions",
    applicant_name: "Mark Aquino",
    application_status: "Shortlisted",
    application_date: "2026-09-18",
  },
];

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("companies");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    }
    return null;
  });

  const isPreviewMode = !currentUser;

  const companies = isPreviewMode ? INITIAL_COMPANIES : (currentUser.companies || []);
  const jobs = isPreviewMode ? INITIAL_JOBS : (currentUser.jobs || []);
  const applications = isPreviewMode ? ALL_APPLICATIONS : (currentUser.applications || []);

  return (
    <div className={styles.dashboardContainer}>
      
      {isPreviewMode && (
        <div style={{ background: "#FFEAA7", color: "#D63031", padding: "8px", textAlign: "center", fontSize: "0.8rem", fontWeight: "bold" }}>
          ⚠️ Viewing Dashboard Layout in Preview Mode (Placeholder Data)
        </div>
      )}
      
      <nav className={styles.navBar}>
        <div>
          <span className={styles.logoText}>HireLink</span>
          <span className={styles.portalBadge}>Staff Portal</span>
        </div>
        <div style={{ fontSize: "0.75rem", color: "#74758A", fontWeight: "600" }}>
          {isPreviewMode ? "Alex Mercado (Coordinator)" : `${currentUser.name} (${currentUser.role})`}
        </div>
      </nav>

      <div className={styles.welcomeHero}>
        <h1>System Review Workspace</h1>
        <p>Verify pending company credentials, audit newly created vacancy parameters, and manage target timeline windows for fair recruitment events.</p>
      </div>

      <div className={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab("companies")}
          className={`${styles.tabButton} ${activeTab === "companies" ? styles.tabButtonActive : ""}`}
        >
          Companies ({companies.length})
        </button>
        <button 
          onClick={() => setActiveTab("jobs")}
          className={`${styles.tabButton} ${activeTab === "jobs" ? styles.tabButtonActive : ""}`}
        >
          Jobs ({jobs.length})
        </button>
        <button 
          onClick={() => setActiveTab("applications")}
          className={`${styles.tabButton} ${activeTab === "applications" ? styles.tabButtonActive : ""}`}
        >
          Applications ({applications.length})
        </button>
      </div>

      <div>
        {activeTab === "companies" && companies.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>{companies[0].company_name}</h3>
                <p style={{ color: "#74758A", fontSize: "0.85rem", marginTop: "0.5rem" }}>{companies[0].company_description}</p>
              </div>
              <button className={styles.actionButtonPrimary}>Approve</button>
            </div>
          </div>
        )}

        {activeTab === "jobs" && jobs.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#6D5DFB", fontWeight: "700", textTransform: "uppercase" }}>{jobs[0].company_name}</span>
                <h3 style={{ margin: "0.25rem 0 0 0", fontSize: "1.25rem", fontWeight: "700" }}>{jobs[0].job_title}</h3>
                <p style={{ color: "#74758A", fontSize: "0.85rem" }}>{jobs[0].job_description}</p>
              </div>
              <button className={styles.actionButtonPrimary}>Publish</button>
            </div>
          </div>
        )}

        {activeTab === "applications" && (
          <div className={styles.tableWrapper}>
            <table className={styles.dashboardTable}>
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Target Role</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.application_id}>
                    <td style={{ fontWeight: "600" }}>{app.applicant_name}</td>
                    <td>{app.job_title}</td>
                    <td style={{ textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedApplication(app)}
                        className={styles.actionButtonSchedule}
                      >
                        📅 Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedApplication && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E4E4ED", paddingBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Arrange Interview</h3>
              <button onClick={() => setSelectedApplication(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#74758A" }}>✕</button>
            </div>

            <div style={{ margin: "1rem 0" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Assigned Staff Host</label>
                <select className={styles.formInput}>
                  <option>Alex Mercado (You)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Starts At (PHT)</label>
                <input type="datetime-local" className={styles.formInput} defaultValue="2026-09-21T09:00" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interview Location / Room Venue</label>
                <input type="text" className={styles.formInput} defaultValue="Interview Booth Room A-1" />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setSelectedApplication(null)} className={styles.actionButtonPrimary} style={{ flex: 1 }}>Save Schedule Mockup</button>
              <button onClick={() => setSelectedApplication(null)} style={{ background: "#F7F7FB", border: "1px solid #E4E4ED", borderRadius: "10px", padding: "0.5rem 1rem", fontSize: "0.75rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
