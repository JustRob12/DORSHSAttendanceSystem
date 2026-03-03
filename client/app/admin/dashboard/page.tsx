"use client";

export default function AdminDashboardPage() {
    const stats = [
        { label: "Total Students", value: "—", icon: "🎓" },
        { label: "Total Teachers", value: "—", icon: "👨‍🏫" },
        { label: "Present Today", value: "—", icon: "✅" },
        { label: "Absent Today", value: "—", icon: "❌" },
    ];

    return (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Heading */}
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                    Dashboard
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>
                    Overview of the SciTrack attendance system.
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
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
                    { title: "Register Teacher", desc: "Add a new teacher account to the system", icon: "👨‍🏫", href: "/admin/register-teacher" },
                    { title: "Register Student", desc: "Enroll a new student in the system", icon: "🎓", href: "/admin/register-student" },
                    { title: "Add Subject", desc: "Create a new subject for a class", icon: "�", href: "/admin/add-subject" },
                    { title: "Attendance Records", desc: "Browse all attendance logs", icon: "📋", href: "#" },
                ].map((item, i) => (
                    <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                        <div style={{
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
                    </a>
                ))}
            </div>
        </div>
    );
}
