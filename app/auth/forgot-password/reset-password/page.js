"use client";

import React, { useState } from "react";
import styles from "./reset.module.css";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRealReset = async (e) => {
    e.preventDefault();
    setLoading(false);
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your entries.");
      return;
    }

    setLoading(true);
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
     
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred during configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Update Account Password</h2>
          <p className={styles.subtitle}>
            Please enter your new secure credentials below to recover your HireLink workspace access.
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleRealReset} className={styles.formStack}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>New Secure Password</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm New Password</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {errorMessage && (
              <div style={{ fontSize: "12px", padding: "12px", borderRadius: "8px", border: "1px solid #FEE2E2", backgroundColor: "#FEF2F2", color: "#EF4444" }}>
                {errorMessage}
              </div>
            )}

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Updating credentials..." : "Update Password"}
            </button>
          </form>
        ) : (
          <div className={styles.successWrapper}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Password Reset Complete</h3>
            <p className={styles.successText}>
              Your configurations have been successfully modified inside the central authentication server database.
            </p>
            <Link href="/auth" className={styles.loginLink}>
              Return to Sign In Portal →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}