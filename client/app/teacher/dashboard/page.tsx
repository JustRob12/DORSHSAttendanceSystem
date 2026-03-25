"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
    subjects: number;
    students: number;
    scans: number;
}

interface AssignedSubjectItem {
    subject_id: number;
    subject_name: string;
    grade: number;
    student_count: number;
}

export default function TeacherDashboard() {
    const [stats, setStats] = useState<DashboardStats>({ subjects: 0, students: 0, scans: 0 });
    const [subjectsList, setSubjectsList] = useState<AssignedSubjectItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) return;
                const { teacherId } = JSON.parse(userObj);

                // 1. Get assigned subject count and details
                const { data: assignedSubj, error: subErr } = await supabase
                    .from("assigned_subject")
                    .select("subject_id, subject:subject_id(subject_name, grade)")
                    .eq("teacher_id", teacherId);

                if (subErr || !assignedSubj) throw subErr;

                const loadedSubjects: AssignedSubjectItem[] = assignedSubj.map(s => ({
                    subject_id: s.subject_id,
                    subject_name: (s.subject as any)?.subject_name || "Unknown",
                    grade: (s.subject as any)?.grade || 0,
                    student_count: 0
                }));

                const subjectIds = loadedSubjects.map(s => s.subject_id);

                // 2. Count distinct students involved in these subjects
                let studentCount = 0;
                let scanCount = 0;

                if (subjectIds.length > 0) {
                    const { data: studentsData } = await supabase
                        .from("student_on_subject")
                        .select("subject_id")
                        .in("subject_id", subjectIds);

                    if (studentsData) {
                        studentCount = studentsData.length;
                        studentsData.forEach(st => {
                            const subj = loadedSubjects.find(s => s.subject_id === st.subject_id);
                            if (subj) subj.student_count++;
                        });
                    }

                    // 3. Count total scans taken today for these subjects
                    const today = new Date().toISOString().split('T')[0];
                    const { count: aCount } = await supabase
                        .from("attendance")
                        .select("*", { count: "exact", head: true })
                        .in("subject_id", subjectIds)
                        .eq("date", today);
                    scanCount = aCount || 0;
                }

                setStats({
                    subjects: subjectIds.length,
                    students: studentCount,
                    scans: scanCount,
                });
                setSubjectsList(loadedSubjects);
            } catch (err) {
                console.error("Error fetching dashboard stats:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>Welcome back, Teacher!</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.25rem" }}>Here&apos;s a quick overview of your assigned subjects and recent attendance.</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <StatCard
                    title="Assigned Subjects"
                    value={isLoading ? "..." : stats.subjects}
                    description="Total classes you handle"
                    accent="#10b981"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>}
                />
                <StatCard
                    title="Total Students"
                    value={isLoading ? "..." : stats.students}
                    description="Across all your subjects"
                    accent="#6366f1"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>}
                />
                <StatCard
                    title="Scans Today"
                    value={isLoading ? "..." : stats.scans}
                    description="Attendance logs marked today"
                    accent="#f59e0b"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>}
                />
            </div>

            {/* Assigned Subjects List */}
            <Card style={{ marginBottom: "2rem" }}>
                <CardHeader>
                    <CardTitle>My Subjects</CardTitle>
                    <CardDescription>Classes you are currently handling and their enrolled students</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p style={{ color: "#737373", fontSize: "0.875rem" }}>Loading subjects...</p>
                    ) : subjectsList.length === 0 ? (
                        <p style={{ color: "#737373", fontSize: "0.875rem" }}>No subjects assigned.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                            {Array.from(new Set(subjectsList.map(s => s.grade)))
                                .sort((a, b) => b - a)
                                .map(grade => {
                                    const gradeSubjects = subjectsList.filter(s => s.grade === grade);
                                    return (
                                        <div key={grade}>
                                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0a0a0a", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #f0f0f0" }}>
                                                Grade {grade}
                                            </h3>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                                                {gradeSubjects.map(subj => (
                                                    <div key={subj.subject_id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e5e5e5", background: "#fff", aspectRatio: "1 / 1", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", overflow: "hidden" }}>
                                                            <h4 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={subj.subject_name}>{subj.subject_name}</h4>
                                                            <span style={{ fontSize: "0.875rem", color: "#737373" }}>Grade {subj.grade}</span>
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: "auto" }}>
                                                            <span style={{ fontSize: "4rem", fontWeight: 800, lineHeight: 1, color: "#0a0a0a", letterSpacing: "-0.05em" }}>{subj.student_count}</span>
                                                            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#737373", marginTop: "0.25rem" }}>Students</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions / Schedule Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Actions</CardTitle>
                    <CardDescription>Shortcut to start scanning barcodes or view logs</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/teacher/scan-attendance" style={{ textDecoration: "none" }}>
                            <div style={{
                                border: "1px solid #e5e5e5", borderRadius: "8px", padding: "1.25rem", cursor: "pointer", transition: "all 0.15s ease",
                                display: "flex", flexDirection: "column", gap: "0.5rem"
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.backgroundColor = "transparent"; }}>
                                <div style={{ fontSize: "1.5rem", width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
                                </div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>Start Scanning</h3>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", margin: 0, lineHeight: 1.4 }}>Open the camera tool to scan student barcodes.</p>
                            </div>
                        </Link>

                        <Link href="/teacher/attendance/records" style={{ textDecoration: "none" }}>
                            <div style={{
                                border: "1px solid #e5e5e5", borderRadius: "8px", padding: "1.25rem", cursor: "pointer", transition: "all 0.15s ease",
                                display: "flex", flexDirection: "column", gap: "0.5rem"
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.backgroundColor = "transparent"; }}>
                                <div style={{ fontSize: "1.5rem", width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                </div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>View Records</h3>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", margin: 0, lineHeight: 1.4 }}>Browse full attendance history and export to Excel.</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
