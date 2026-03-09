"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({ students: 0, teachers: 0, subjects: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch student count
                const { count: studentCount } = await supabase
                    .from("students")
                    .select("*", { count: "exact", head: true });

                // Fetch teacher count
                const { count: teacherCount } = await supabase
                    .from("teacher")
                    .select("*", { count: "exact", head: true });

                // Fetch subject count
                const { count: subjectCount } = await supabase
                    .from("subject")
                    .select("*", { count: "exact", head: true });

                setStats({
                    students: studentCount || 0,
                    teachers: teacherCount || 0,
                    subjects: subjectCount || 0,
                });
            } catch (err) {
                console.error("Failed to load admin stats", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statConfig = [
        {
            title: "Total Students",
            value: isLoading ? "..." : stats.students,
            accent: "#3b82f6",
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5" /></svg>,
            desc: "Registered students",
        },
        {
            title: "Total Teachers",
            value: isLoading ? "..." : stats.teachers,
            accent: "#8b5cf6",
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>,
            desc: "Registered teachers",
        },
        {
            title: "Total Subjects",
            value: isLoading ? "..." : stats.subjects,
            accent: "#10b981",
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>,
            desc: "Created class subjects",
        },
    ];

    const actions = [
        { title: "Register Teacher", desc: "Add a new teacher account to the system", icon: "👨‍🏫", href: "/admin/register-teacher" },
        { title: "Register Student", desc: "Enroll a new student in the system", icon: "🎓", href: "/admin/register-student" },
        { title: "Add Subject", desc: "Create a new subject for a class", icon: "📚", href: "/admin/add-subject" },
        { title: "Assign Subjects", desc: "Link a teacher to a specific subject", icon: "📋", href: "/admin/assigned-subject" },
    ];

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            {/* Heading */}
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>
                    Admin Dashboard
                </h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.25rem" }}>
                    Overview of the SciTrack attendance system.
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {statConfig.map((s, i) => (
                    <StatCard
                        key={i}
                        title={s.title}
                        value={s.value}
                        icon={s.icon}
                        accent={s.accent}
                        description={s.desc}
                    />
                ))}
            </div>

            {/* Quick links as clean cards */}
            <Card>
                <CardHeader>
                    <CardTitle>System Actions</CardTitle>
                    <CardDescription>Shortcut links to common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                        {actions.map((item, i) => (
                            <Link key={i} href={item.href} style={{ textDecoration: "none" }}>
                                <div style={{
                                    border: "1px solid #e5e5e5", borderRadius: "8px", padding: "1rem",
                                    cursor: "pointer", transition: "all 0.15s ease",
                                    display: "flex", alignItems: "flex-start", gap: "0.875rem"
                                }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                        e.currentTarget.style.backgroundColor = "#f8fafc";
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = "#e5e5e5";
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }}>
                                    <div style={{ fontSize: "1.5rem", width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0a0a0a" }}>{item.title}</p>
                                        <p style={{ fontSize: "0.75rem", color: "#737373", marginTop: "2px", lineHeight: 1.4 }}>{item.desc}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
