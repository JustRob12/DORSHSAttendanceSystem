"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentDashboard() {
    const [studentName, setStudentName] = useState<string>("Student");
    const [stats, setStats] = useState({ enrolled: 0, classesToday: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudentInfo = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) return;
                const { studentId, id: student_account_id } = JSON.parse(userObj);

                // Fetch Name
                const { data } = await supabase
                    .from("students")
                    .select("firstname")
                    .eq("student_id", studentId)
                    .single();

                if (data && data.firstname) setStudentName(data.firstname);

                // 1. Fetch Enrolled Subjects Count uses new student_on_subject mapping
                const { data: enrolledObj, error: enrErr } = await supabase
                    .from("student_on_subject")
                    .select("subject_id")
                    .eq("student_account_id", student_account_id);

                if (enrErr) throw enrErr;

                const enrolledCount = enrolledObj ? enrolledObj.length : 0;

                // 2. Fetch Classes Today based on enrolled subjects & day of week
                let classesTodayCount = 0;
                if (enrolledObj && enrolledObj.length > 0) {
                    const subjectIds = enrolledObj.map(row => row.subject_id);
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const currentDay = days[new Date().getDay()];

                    const { count, error: datesErr } = await supabase
                        .from('subject_dates')
                        .select('*', { count: 'exact', head: true })
                        .in('subject_id', subjectIds)
                        .eq('day', currentDay);

                    if (!datesErr && count !== null) {
                        classesTodayCount = count;
                    }
                }

                setStats({
                    enrolled: enrolledCount,
                    classesToday: classesTodayCount,
                });

            } catch (error) {
                console.error("Error fetching student logic:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentInfo();
    }, []);

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>Welcome back, {studentName}!</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.25rem" }}>Here&apos;s a quick overview of your enrolled classes.</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                <StatCard
                    title="Enrolled Subjects"
                    value={isLoading ? "..." : stats.enrolled}
                    description="Total classes you are in"
                    accent="#16a34a"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>}
                />
                <StatCard
                    title="Classes Today"
                    value={isLoading ? "..." : stats.classesToday}
                    description="Estimated subjects scheduled today"
                    accent="#eab308"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                />
            </div>

            {/* Quick Actions / Shortcuts Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Shortcuts</CardTitle>
                    <CardDescription>Quick access to your student tools</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/student/my-qr-code" style={{ textDecoration: "none" }}>
                            <div style={{
                                border: "1px solid #e5e5e5", borderRadius: "8px", padding: "1.25rem", cursor: "pointer", transition: "all 0.15s ease",
                                display: "flex", flexDirection: "column", gap: "0.5rem"
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.backgroundColor = "transparent"; }}>
                                <div style={{ fontSize: "1.5rem", width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><rect x="7" y="7" width="3" height="3" /><rect x="14" y="7" width="3" height="3" /><rect x="7" y="14" width="3" height="3" /><rect x="14" y="14" width="3" height="3" /></svg>
                                </div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>My QR Code</h3>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", margin: 0, lineHeight: 1.4 }}>Quickly pull up your ID barcode to be scanned by teachers.</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
