"use client";

import { useState } from "react";

export default function RegisterTeacherPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccess("");
        setError("");
        // TODO: wire up to Supabase insert
        await new Promise(r => setTimeout(r, 1000));
        setSuccess("Teacher registered successfully!");
        setIsLoading(false);
        (e.target as HTMLFormElement).reset();
    };

    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem"
    };
    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "0.5625rem 0.75rem", borderRadius: "8px",
        border: "1px solid #e5e5e5", fontSize: "0.875rem", color: "#0a0a0a",
        background: "#fff", outline: "none", boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "640px" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                    Register Teacher
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>
                    Create a new teacher account in the system.
                </p>
            </div>

            <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {success && (
                    <div style={{ padding: "0.625rem 0.875rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.8125rem", color: "#16a34a", marginBottom: "1.25rem" }}>
                        {success}
                    </div>
                )}
                {error && (
                    <div style={{ padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.8125rem", color: "#dc2626", marginBottom: "1.25rem" }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div>
                            <label style={labelStyle}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                            <input type="text" style={inputStyle} placeholder="Juan" required />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                            <input type="text" style={inputStyle} placeholder="Dela Cruz" required />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Middle Name</label>
                        <input type="text" style={inputStyle} placeholder="Santos" />
                    </div>

                    <div>
                        <label style={labelStyle}>Email <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="email" style={inputStyle} placeholder="teacher@dorshs.edu.ph" required />
                    </div>

                    <div>
                        <label style={labelStyle}>Username <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="text" style={inputStyle} placeholder="e.g. jdelacruz" required />
                    </div>

                    <div>
                        <label style={labelStyle}>Password <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="password" style={inputStyle} placeholder="••••••••" required minLength={6} />
                    </div>

                    <div>
                        <label style={labelStyle}>Subject / Department</label>
                        <input type="text" style={inputStyle} placeholder="e.g. Mathematics" />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: "0.625rem 1.25rem", background: "#16a34a", color: "white",
                            border: "none", borderRadius: "8px", fontSize: "0.9375rem",
                            fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.7 : 1, marginTop: "0.25rem",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                            fontFamily: "Inter, sans-serif",
                        }}
                    >
                        {isLoading ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                Registering…
                            </>
                        ) : "Register Teacher"}
                    </button>
                </form>
            </div>
        </div>
    );
}
