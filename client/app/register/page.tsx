"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";

const STEPS = ["Personal Info", "Profile Photo", "Account Setup"];

export default function RegisterPage() {
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const getStrength = (pwd: string) => {
        if (!pwd) return { label: "", color: "#e5e5e5", width: 0 };
        if (pwd.length < 6) return { label: "Weak", color: "#ef4444", width: 25 };
        if (pwd.length < 10) return { label: "Fair", color: "#f59e0b", width: 55 };
        if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd))
            return { label: "Strong", color: "#16a34a", width: 100 };
        return { label: "Good", color: "#22c55e", width: 78 };
    };
    const strength = getStrength(password);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 2) { setStep(s => s + 1); return; }
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem"
    };

    return (
        <div className="grid-bg min-h-screen flex items-center justify-center p-4 md:p-0">

            {/* ── Split card ── */}
            <div
                className="animate-fade-in-up sc-card w-full overflow-hidden"
                style={{
                    maxWidth: "960px",
                    display: "flex",
                    flexDirection: "row",
                    minHeight: "580px",
                    borderRadius: "16px",
                }}
            >
                {/* ── LEFT: Branding panel ── */}
                <div
                    className="hidden md:flex"
                    style={{
                        width: "38%",
                        flexShrink: 0,
                        background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3rem 2.25rem",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                    <div style={{ position: "absolute", bottom: "-80px", left: "-40px", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

                    <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                        <div style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 88, height: 88, borderRadius: "20px",
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            marginBottom: "1.5rem",
                        }}>
                            <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={64} height={64} style={{ borderRadius: "12px" }} priority />
                        </div>

                        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
                            SciTrack
                        </h1>
                        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: "190px", margin: "0 auto 2rem" }}>
                            Davao Oriental Regional Science High School
                        </p>

                        {/* Step progress summary */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", textAlign: "left" }}>
                            {STEPS.map((label, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.6875rem", fontWeight: 600,
                                        background: i < step ? "rgba(134,239,172,0.25)" : i === step ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                                        border: i <= step ? "1px solid rgba(134,239,172,0.5)" : "1px solid rgba(255,255,255,0.15)",
                                        color: i < step ? "#86efac" : i === step ? "#ffffff" : "rgba(255,255,255,0.35)",
                                    }}>
                                        {i < step ? "✓" : i + 1}
                                    </div>
                                    <span style={{
                                        fontSize: "0.8125rem",
                                        color: i < step ? "#86efac" : i === step ? "#ffffff" : "rgba(255,255,255,0.4)",
                                        fontWeight: i === step ? 500 : 400,
                                    }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Form panel ── */}
                <div style={{ flex: 1, padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "center", overflowY: "auto" }}>

                    {/* Mobile-only logo */}
                    <div className="flex md:hidden" style={{ alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid #e5e5e5" }}>
                        <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={36} height={36} style={{ borderRadius: "8px" }} />
                        <div>
                            <h1 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>SciTrack</h1>
                            <p style={{ fontSize: "0.6875rem", color: "#737373" }}>DORSHS Attendance System</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: "1.25rem" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                            Create an account
                        </h2>
                        <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "3px" }}>Complete all steps to register</p>
                    </div>

                    {/* Stepper indicator (desktop) */}
                    <div className="hidden md:flex" style={{ alignItems: "center", marginBottom: "1.5rem" }}>
                        {STEPS.map((label, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "unset" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: "50%",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.75rem", fontWeight: 600,
                                        background: i <= step ? "#16a34a" : "#f5f5f5",
                                        color: i <= step ? "#fff" : "#a3a3a3",
                                        border: i <= step ? "2px solid #16a34a" : "2px solid #e5e5e5",
                                        transition: "all 0.2s ease", flexShrink: 0,
                                    }}>
                                        {i < step ? (
                                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                                <path d="M3 8l3.5 3.5L13 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : i + 1}
                                    </div>
                                    <span style={{ fontSize: "0.5625rem", color: i <= step ? "#16a34a" : "#a3a3a3", fontWeight: 500, whiteSpace: "nowrap" }}>
                                        {label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div style={{ flex: 1, height: 2, marginBottom: "14px", background: i < step ? "#16a34a" : "#e5e5e5", transition: "background 0.3s ease" }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile stepper (pills) */}
                    <div className="flex md:hidden" style={{ gap: "0.375rem", marginBottom: "1.25rem" }}>
                        {STEPS.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: "2px", background: i <= step ? "#16a34a" : "#e5e5e5", transition: "background 0.3s ease" }} />
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

                        {/* Step 1 */}
                        {step === 0 && (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <div>
                                        <label style={labelStyle}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                                        <input type="text" className="sc-input" placeholder="Juan" required />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                                        <input type="text" className="sc-input" placeholder="Dela Cruz" required />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Middle Name <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input type="text" className="sc-input" placeholder="Santos" required />
                                </div>
                                <div>
                                    <label style={labelStyle}>
                                        Extension
                                        <span style={{ fontSize: "0.75rem", color: "#a3a3a3", fontWeight: 400, marginLeft: "4px" }}>(optional)</span>
                                    </label>
                                    <input type="text" className="sc-input" placeholder="Jr., Sr., III" />
                                </div>
                                <div>
                                    <label style={labelStyle}>LRN <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input type="text" className="sc-input" placeholder="12-digit Learner Reference Number" required maxLength={12} />
                                </div>
                            </>
                        )}

                        {/* Step 2 */}
                        {step === 1 && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "0.5rem 0" }}>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        width: 96, height: 96, borderRadius: "50%",
                                        border: "2px dashed #d4d4d4",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", overflow: "hidden",
                                        background: preview ? "transparent" : "#fafafa",
                                        transition: "border-color 0.2s ease",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#16a34a")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#d4d4d4")}
                                >
                                    {preview ? (
                                        <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="4" stroke="#a3a3a3" strokeWidth="1.5" />
                                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                                <div style={{ textAlign: "center" }}>
                                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a" }}>Upload Profile Photo</p>
                                    <p style={{ fontSize: "0.75rem", color: "#737373", marginTop: "2px" }}>Click the circle above or use the button below</p>
                                    <p style={{ fontSize: "0.6875rem", color: "#a3a3a3", marginTop: "4px" }}>JPG, PNG or GIF · Max 5MB</p>
                                </div>
                                <button type="button" onClick={() => fileRef.current?.click()} className="sc-btn sc-btn-outline" style={{ width: "auto", padding: "0.4rem 1.25rem", fontSize: "0.8125rem" }}>
                                    Choose file
                                </button>
                                {preview && (
                                    <button type="button" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                                        style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#737373", cursor: "pointer", textDecoration: "underline" }}>
                                        Remove photo
                                    </button>
                                )}
                                <p style={{ fontSize: "0.75rem", color: "#a3a3a3", fontStyle: "italic" }}>Photo is optional — you can skip this step</p>
                            </div>
                        )}

                        {/* Step 3 */}
                        {step === 2 && (
                            <>
                                <div>
                                    <label style={labelStyle}>Username <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input type="text" className="sc-input" placeholder="e.g. jdelacruz" required />
                                </div>
                                <div>
                                    <label style={labelStyle}>Password <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <input type={showPassword ? "text" : "password"} className="sc-input" placeholder="••••••••" required
                                            value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: "3rem" }} />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                                            position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)",
                                            background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#737373", fontFamily: "Inter, sans-serif",
                                        }}>{showPassword ? "Hide" : "Show"}</button>
                                    </div>
                                    {password && (
                                        <div style={{ marginTop: "6px" }}>
                                            <div className="strength-bar">
                                                <div className="strength-bar-fill" style={{ width: `${strength.width}%`, background: strength.color }} />
                                            </div>
                                            <p style={{ fontSize: "0.6875rem", color: strength.color, marginTop: "3px", fontWeight: 500 }}>{strength.label}</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Confirm Password <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <input type={showConfirm ? "text" : "password"} className="sc-input" placeholder="••••••••" required style={{ paddingRight: "3rem" }} />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)} style={{
                                            position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)",
                                            background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#737373", fontFamily: "Inter, sans-serif",
                                        }}>{showConfirm ? "Hide" : "Show"}</button>
                                    </div>
                                </div>
                                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.8125rem", color: "#737373", cursor: "pointer" }}>
                                    <input type="checkbox" required style={{ marginTop: "2px", accentColor: "#16a34a", flexShrink: 0 }} />
                                    <span>
                                        I agree to the{" "}
                                        <a href="#" style={{ color: "#16a34a", fontWeight: 500, textDecoration: "none" }}>Terms of Service</a>
                                        {" "}and{" "}
                                        <a href="#" style={{ color: "#16a34a", fontWeight: 500, textDecoration: "none" }}>Privacy Policy</a>
                                    </span>
                                </label>
                            </>
                        )}

                        {/* Navigation */}
                        <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
                            {step > 0 && (
                                <button type="button" onClick={() => setStep(s => s - 1)} className="sc-btn sc-btn-outline" style={{ flex: 1 }}>
                                    ← Back
                                </button>
                            )}
                            <button type="submit" disabled={isLoading} className="sc-btn sc-btn-primary" style={{ flex: 1 }}>
                                {isLoading ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        Creating…
                                    </>
                                ) : step === 2 ? "Create account" : step === 1 ? (preview ? "Next →" : "Skip →") : "Next →"}
                            </button>
                        </div>
                    </form>

                    <div className="sc-separator" style={{ margin: "1.25rem 0" }}><span>Already have an account?</span></div>
                    <Link href="/login" className="sc-btn sc-btn-outline" style={{ textDecoration: "none", display: "flex" }}>Sign in</Link>

                    <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "#a3a3a3", marginTop: "1.5rem" }}>
                        © 2026 Davao Oriental Regional Science High School
                    </p>
                </div>
            </div>
        </div>
    );
}
