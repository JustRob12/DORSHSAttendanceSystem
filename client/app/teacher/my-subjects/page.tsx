"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface SubjectDate {
    day: string;
    start_time: string;
    end_time: string;
}

interface Subject {
    subject_id: number;
    subject_name: string;
    grade: number;
    subject_description: string | null;
    subject_dates: SubjectDate[];
}

function fmt12h(time: string) {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const DAY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    Monday: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    Tuesday: { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
    Wednesday: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    Thursday: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    Friday: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
};

export default function TeacherMySubjectsPage() {
    const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAssignedSubjects = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { teacherId } = JSON.parse(userObj);

                // Fetch directly from assigned_subject inner joined to subject and subject_dates
                const { data, error } = await supabase
                    .from("assigned_subject")
                    .select(`
                        subject:subject_id (
                            subject_id, subject_name, grade, subject_description,
                            subject_dates(day, start_time, end_time)
                        )
                    `)
                    .eq("teacher_id", teacherId);

                if (error) throw error;

                if (data) {
                    setAssignedSubjects(data.map(item => item.subject as unknown as Subject));
                }
            } catch (err: unknown) {
                console.error("Error fetching assigned subjects:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAssignedSubjects();
    }, []);

    // Grouping for rendering logic if desired, or simply map it straight matching the Add Subject grid
    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>My Subjects</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>View your assigned classes and schedules.</p>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                    <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                    <p>Loading your assigned subjects...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : assignedSubjects.length === 0 ? (
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "4rem 2rem", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#404040", marginBottom: "0.5rem" }}>No Subjects Assigned</h3>
                    <p style={{ fontSize: "0.875rem", color: "#737373" }}>You currently don't have any classes assigned to you.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
                    {Array.from(new Set(assignedSubjects.map(s => s.grade)))
                        .sort((a, b) => b - a)
                        .map(grade => {
                            const gradeSubjects = assignedSubjects.filter(s => s.grade === grade);
                            return (
                                <div key={grade}>
                                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0a0a0a", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #f0f0f0" }}>
                                        Grade {grade}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {gradeSubjects.map(sub => {
                                            const sortedDates = [...(sub.subject_dates || [])].sort((a, b) => {
                                                const o = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                                                return o.indexOf(a.day) - o.indexOf(b.day);
                                            });

                                            return (
                                                <Link href={`/teacher/my-subjects/${sub.subject_id}`} key={sub.subject_id} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
                                                    <div style={{
                                                        background: "white", borderRadius: "16px", overflow: "hidden",
                                                        border: `1px solid #e5e5e5`,
                                                        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)",
                                                        display: "flex", flexDirection: "column", flexGrow: 1,
                                                        transition: "transform 0.2s, box-shadow 0.2s",
                                                    }}
                                                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 25px -5px rgba(0,0,0,0.1)"; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px -5px rgba(0,0,0,0.05)"; }}
                                                    >
                                                        <div style={{ padding: "1.5rem", borderBottom: "1px solid #f5f5f5", position: "relative", overflow: "hidden" }}>
                                                            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "#f0fdf4", borderRadius: "50%", opacity: 0.5, zIndex: 0 }}></div>

                                                            <div style={{ position: "relative", zIndex: 1 }}>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                                                    <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0a0a0a" }}>{sub.subject_name}</h3>
                                                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: "#f3f4f6", color: "#525252" }}>
                                                                        Grade {sub.grade}
                                                                    </span>
                                                                </div>
                                                                <p style={{ fontSize: "0.875rem", color: "#737373", lineHeight: 1.5, minHeight: "2.5rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                                    {sub.subject_description || "No description provided."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div style={{ padding: "1.25rem 1.5rem", background: "#fafafa", flexGrow: 1 }}>
                                                            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Schedule Overview</p>
                                                            {sortedDates.length === 0 ? (
                                                                <p style={{ fontSize: "0.8125rem", color: "#a3a3a3", fontStyle: "italic" }}>No schedule assigned</p>
                                                            ) : (
                                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                                    {sortedDates.map((d, i) => {
                                                                        const col = DAY_COLORS[d.day] || { bg: "#f5f5f5", border: "#e5e5e5", text: "#737373" };
                                                                        return (
                                                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "0.5rem 0.75rem", borderRadius: "8px", border: `1px solid ${col.border}` }}>
                                                                                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: col.text }}>{d.day}</span>
                                                                                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#525252" }}>{fmt12h(d.start_time)} – {fmt12h(d.end_time)}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
