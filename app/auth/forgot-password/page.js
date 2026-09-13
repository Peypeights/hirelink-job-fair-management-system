"use client";

import {useState} from "react";
import Link from "next/link";
import Styles from "../auth.module.css";

export default function ForgotPasswordPage(){
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setMessageType("");

        if (!email.trim() || !email.includes("@")){
            setMessageType("error");
            setMessage("Please enter a valid email address.");
            setLoading(false);
            return;
        }
        
        try {
            await new Promise((resolve) => setTimeout(resolve, 1200));

            setIsSubmitted(true);
            setMessageType("success");
            setMessage("Recovery link sent! Please check your email inbox.");
        } catch (err) {
            setMessageType("error");
            setMessage("An unexpected error occured. Please try again.")
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className={Styles.recoveryPage}>
      <div className={Styles.recoveryCard}>
        
        <div className={Styles.formHeader}>
          <h2>Reset password</h2>
          <p>
            Enter the email address tied to your account and we will send you a secure recovery link.
          </p>
        </div>

        {!isSubmitted ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label htmlFor="email" style={{ fontSize: "11px", fontWeight: "600", color: "#74758A" }}>
                    EMAIL ADDRESS
                </label>
                <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={Styles.inputField}
                    required
                />
                </div>

                {message && (
                <div style={{ fontSize: "12px", padding: "12px", borderRadius: "8px", border: "1px solid", backgroundColor: messageType === "error" ? "#FEF2F2" : "#F0FDF4", borderColor: messageType === "error" ? "#FEE2E2" : "#DCFCE7", color: messageType === "error" ? "#EF4444" : "#15803D" }}>
                    {message}
                </div>
                )}

                <button type="submit" disabled={loading} className={Styles.submitBtn}>
                {loading ? "Sending link..." : "Send Recovery Link"}
                </button>
            </form>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(109, 93, 251, 0.1)", color: "#6D5DFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "bold" }}>
                    ✓
                </div>
                <p style={{ fontSize: "14px", color: "#74758A", lineHeight: "1.5" }}>{message}</p>
                <button 
                    onClick={() => { setIsSubmitted(false); setEmail(""); setMessage(""); }}
                    style={{ background: "none", border: "none", color: "#6D5DFB", fontSize: "12px", fontWeight: "600", cursor: "pointer", marginTop: "8px" }}
                >
                    ← Back to entry
                </button>
            </div>
        )}

            <div style={{ marginTop: "24px", borderTop: "1px solid #E4E4ED", paddingTop: "16px", textAlign: "center" }}>
            <Link href="/auth" style={{ fontSize: "13px", fontWeight: "500", color: "#74758A", textDecoration: "none" }}>
                Return to Sign In
            </Link>
            </div>

        </div>
    </div>
  );
}