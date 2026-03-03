"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserSession {
    id: number;
    username: string;
    role: string;
    studentId?: number;
}

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<UserSession | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("user");
        if (!raw) { router.push("/login"); return; }
        const parsed = JSON.parse(raw);
        if (parsed.role !== "Member" && parsed.role !== "President") { router.push("/login"); return; }
        setUser(parsed);
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem("user");
        router.push("/login");
    };

    if (!user) return null;

    const stats = [
        { label: "Days Present", value: "—", icon: "✅" },
        { label: "Days Absent", value: "—", icon: "❌" },
        { label: "Days Late", value: "—", icon: "⏰" },
        { label: "Attendance Rate", value: "—%", icon: "📈" },
    ];

    return (
        <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "Inter, sans-serif" }}>
            {/* Header */}
            <header style={{
                background: "#ffffff", borderBottom: "1px solid #e5e5e5",
                padding: "0 2rem", height: "60px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={32} height={32} style={{ borderRadius: "6px" }} />
                    <span style={{ fontWeight: 600, color: "#0a0a0a", fontSize: "0.9375rem" }}>SciTrack</span>
                    <span style={{
                        fontSize: "0.6875rem", fontWeight: 500, color: "#7c3aed",
                        background: "#ede9fe", padding: "2px 8px", borderRadius: "20px",
                    }}>{user.role}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "#737373" }}>{user.username}</span>
                    <button onClick={handleLogout} style={{
                        padding: "0.375rem 0.875rem", borderRadius: "6px",
                        border: "1px solid #e5e5e5", background: "white",
                        fontSize: "0.8125rem", color: "#0a0a0a", cursor: "pointer",
                    }}>Sign out</button>
                </div>
            </header>

            <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                        Student Dashboard
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>
                        Welcome back, <strong>{user.username}</strong>. Track your attendance below.
                    </p>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: "white", border: "1px solid #e5e5e5",
                            borderRadius: "12px", padding: "1.25rem",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <p style={{ fontSize: "0.75rem", color: "#737373", fontWeight: 500 }}>{s.label}</p>
                                    <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0a0a0a", marginTop: "4px" }}>{s.value}</p>
                                </div>
                                <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick links */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                    {[
                        { title: "My Attendance", desc: "View your full attendance history", icon: "📋" },
                        { title: "Today's Status", desc: "Check if you're marked present today", icon: "📅" },
                        { title: "My Profile", desc: "View and update your information", icon: "👤" },
                        ...(user.role === "President"
                            ? [{ title: "Class Overview", desc: "View attendance for your class", icon: "🏫" }]
                            : []),
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: "white", border: "1px solid #e5e5e5",
                            borderRadius: "12px", padding: "1.25rem", cursor: "pointer",
                            transition: "box-shadow 0.15s ease",
                        }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                            <div style={{ fontSize: "1.5rem", marginBottom: "0.625rem" }}>{item.icon}</div>
                            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>{item.title}</p>
                            <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "3px" }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
