"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { decryptPassword } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Try admin
      const { data: admin, error: adminErr } = await supabase
        .from("account_admin")
        .select("id, username")
        .eq("username", username)
        .eq("password", password)
        .single();
      if (adminErr && adminErr.code !== "PGRST116") console.error("Admin query error:", adminErr);

      if (admin) {
        sessionStorage.setItem("user", JSON.stringify({ id: admin.id, username: admin.username, role: "admin" }));
        router.push("/admin/dashboard");
        return;
      }

      // 2. Try teacher
      const { data: teacher } = await supabase
        .from("account_teacher")
        .select("teacher_account_id, username, role, teacher_id")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (teacher) {
        sessionStorage.setItem("user", JSON.stringify({ id: teacher.teacher_account_id, username: teacher.username, role: teacher.role ?? "teacher", teacherId: teacher.teacher_id }));
        router.push("/teacher/dashboard");
        return;
      }

      // 3. Try student — fetch by username, decrypt stored password, compare
      const { data: student } = await supabase
        .from("account_students")
        .select("student_account_id, username, role, student_id, password")
        .eq("username", username)
        .single();

      if (student && decryptPassword(student.password) === password) {
        sessionStorage.setItem("user", JSON.stringify({ id: student.student_account_id, username: student.username, role: student.role ?? "Member", studentId: student.student_id }));
        router.push("/student/dashboard");
        return;
      }

      setError("Invalid username or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid-bg min-h-screen flex items-center justify-center p-4 md:p-0">
      <div
        className="animate-fade-in-up sc-card w-full overflow-hidden"
        style={{ maxWidth: "900px", display: "flex", flexDirection: "row", minHeight: "520px", borderRadius: "16px" }}
      >
        {/* LEFT: Branding panel */}
        <div
          className="hidden md:flex"
          style={{
            width: "42%", flexShrink: 0,
            background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "3rem 2.5rem", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: "-80px", left: "-40px", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
              <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={150} height={150} priority />
            </div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
              SciTrack
            </h1>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: "200px", margin: "0 auto" }}>
              Davao Oriental Regional Science High School
            </p>
            <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
              {[
                "Real-time attendance tracking",
                "Secure, role-based access",
                "Automated records & reports",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#86efac", flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.75)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Form panel */}
        <div style={{ flex: 1, padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid #e5e5e5" }}>
            <div style={{ width: 40, height: 40 }}>
              <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={50} height={50} style={{ borderRadius: "8px" }} priority />
            </div>
            <div>
              <h1 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>SciTrack</h1>
              <p style={{ fontSize: "0.6875rem", color: "#737373" }}>DORSHS Attendance System</p>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em" }}>Welcome to SciTrack</h2>
            <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "3px" }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Error message */}
            {error && (
              <div style={{
                padding: "0.625rem 0.875rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                color: "#dc2626",
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="sc-label">Username</label>
              <input
                id="username"
                type="text"
                className="sc-input"
                placeholder="Enter your username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                <label htmlFor="password" className="sc-label" style={{ margin: 0 }}>Password</label>
                {/* <a href="#" style={{ fontSize: "0.75rem", color: "#16a34a", textDecoration: "none", fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                  Forgot password?
                </a> */}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="sc-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: "3rem" }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#737373", fontFamily: "Inter, sans-serif",
                }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="sc-btn sc-btn-primary" style={{ marginTop: "0.25rem" }}>
              {isLoading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign in"}
            </button>
          </form>

          {/* <div className="sc-separator" style={{ margin: "1.25rem 0" }}><span>or</span></div>
          <Link href="/register" className="sc-btn sc-btn-outline" style={{ textDecoration: "none", display: "flex" }}>
            Create an account
          </Link> */}
          <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "#a3a3a3", marginTop: "1.5rem" }}>
            © 2026 Davao Oriental Regional Science High School
          </p>
        </div>
      </div>
    </div>
  );
}
