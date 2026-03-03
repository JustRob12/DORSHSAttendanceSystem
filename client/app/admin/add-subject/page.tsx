"use client";

import { useState } from "react";

export default function AddSubjectPage() {
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
        setSuccess("Subject added successfully!");
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
        <div style={{ padding: "2rem", maxWidth: "560px" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                    Add Subject
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>
                    Create a new subject and assign it to a grade level.
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
                    <div>
                        <label style={labelStyle}>Subject Name <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="text" style={inputStyle} placeholder="e.g. General Mathematics" required />
                    </div>

                    <div>
                        <label style={labelStyle}>Subject Code</label>
                        <input type="text" style={inputStyle} placeholder="e.g. MATH101" />
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                            placeholder="Brief description of the subject…"
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div>
                            <label style={labelStyle}>Grade Level <span style={{ color: "#ef4444" }}>*</span></label>
                            <select style={{ ...inputStyle, cursor: "pointer" }} required>
                                <option value="">Select grade</option>
                                {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Semester</label>
                            <select style={{ ...inputStyle, cursor: "pointer" }}>
                                <option value="">All year</option>
                                <option value="1">1st Semester</option>
                                <option value="2">2nd Semester</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Assigned Teacher</label>
                        <input type="text" style={inputStyle} placeholder="Search teacher name…" />
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
                        {isLoading ? "Saving…" : "Add Subject"}
                    </button>
                </form>
            </div>
        </div>
    );
}
