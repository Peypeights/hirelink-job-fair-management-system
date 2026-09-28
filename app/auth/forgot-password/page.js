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
            const response = await fetch('/api/onboarding/auth/forgot-password', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim() }),
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")){
                throw new Error("Our servers are currently unreachable. Please try again later.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong.');
            }

            setIsSubmitted(true);
            setMessageType('success');
            setMessage('Recovery link sent! Please check your email inbox.');

            } catch (err) {
            setMessageType('error');
            setMessage(err.message || 'An unexpected error occurred. Please try again.');
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
                    
                
                    <Link 
                        href="/auth/forgot-password/reset-password" 
                        style={{ background: "#6D5DFB", color: "white", padding: "10px 16px", borderRadius: "10px", textDecoration: "none", fontSize: "13px", fontWeight: "600", width: "100%", boxSizing: "border-box", marginTop: "8px", boxShadow: "0 4px 6px rgba(109, 93, 251, 0.2)" }}
                    >
                        Go to Reset Password Screen
                    </Link>

                    <button 
                        onClick={() => { setIsSubmitted(false); setEmail(""); setMessage(""); }}
                        style={{ background: "none", border: "none", color: "#74758A", fontSize: "12px", fontWeight: "600", cursor: "pointer", marginTop: "4px" }}
                    >
                        ← Send another link
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